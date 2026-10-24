// Client for the Decision Brain server (rules only, no AI). The browser calls it directly:
//   POST ${base}/v1/think     one brain pass on the current screen state
//   GET  ${base}/v1/scenario  the server's synthetic 14-day history (fetched once)
// The same server can be reached at two addresses: VITE_BRAIN_URL (primary) and
// VITE_BRAIN_URL_BACKUP (backup). A call that fails on one (network error, timeout, 5xx,
// 408, 429 or a bad answer) is sent again to the other; any other 4xx is a bad request and
// is not retried. The address that answered last is tried first next time (page memory only).
// Nothing here throws to the UI: every call answers { ok: true, data, served } or { ok: false, reason }.

// Per attempt, so the worst case with both addresses is twice this.
export const BRAIN_TIMEOUT_MS = 6000;

export type BrainFailure = 'not_configured' | 'timeout' | 'network' | 'http_error' | 'bad_shape';

// Which address answered: the primary or the backup.
export type BrainServed = 'primary' | 'backup';

export type BrainResult<T> = { ok: true; data: T; served: BrainServed } | { ok: false; reason: BrainFailure };

export interface BrainLifelogItem {
  id: string;
  date: string;
  source: string;
  title?: string;
  summary?: string;
  tags?: string[];
  url?: string | null;
  condition?: number;
  blocker_reason?: string;
  [key: string]: unknown;
}

export interface BrainCheckin {
  actionId: string;
  kind: 'done' | 'not_today';
  day: string;
  date?: string;
  blocker_reason?: string;
  [key: string]: unknown;
}

// The /v1/think input (all optional on the server side).
export interface ThinkInput {
  fields?: { career: string; now: string; pull: string };
  lifelog?: BrainLifelogItem[];
  enabledSources?: string[];
  rankedRoles?: unknown[];
  path?: Record<string, unknown>;
  week?: Record<string, unknown>;
  checkins?: BrainCheckin[];
  condition?: number;
  today?: string;
}

export interface BrainTraceEntry {
  fn: string;
  input: string;
  output: string;
  via?: string;
}

export interface BrainMilestone {
  id: string;
  name?: string;
  week?: number;
  date?: string;
  outcome?: string;
  evidence?: string;
  passed?: boolean;
}

export interface BrainEvidence {
  type: string;
  id?: string;
  date?: string;
  note?: string;
  [key: string]: unknown;
}

// One step of the brain's four-layer story (trace_layers). 'designed' steps are part of the
// design but do not run today (ms is null for them).
export type BrainLayer = 'L1' | 'L2' | 'L3' | 'L4';

export interface BrainLayerStep {
  layer: BrainLayer;
  stage: string;
  label: string;
  status: 'ran' | 'designed';
  input_summary: string;
  output_summary: string;
  ms: number | null;
}

// Internal names -> short user-facing labels (brain/labels.js). `layers` is optional and lets
// the server name the four layers itself.
export interface BrainLabels {
  fields: Record<string, string>;
  values: Record<string, Record<string, string>>;
  layers?: Partial<Record<BrainLayer, string>>;
}

// Only the parts the screen reads are typed; the rest is passed through untouched.
export interface ThinkOutput {
  person: Record<string, unknown>;
  state: {
    energy: number | null;
    momentum: number | null;
    selfEfficacy: number | null;
    risk: { level: string; reasons: string[]; points?: number };
    [key: string]: unknown;
  };
  goal: { state?: string; milestones: BrainMilestone[]; [key: string]: unknown };
  constraint: {
    constraint: string;
    score?: number;
    reason?: string;
    signals?: Array<{ id?: string; constraint?: string; reason?: string }>;
    [key: string]: unknown;
  };
  monitor: { drift: Array<{ type?: string; actionId?: string; note?: string }>; [key: string]: unknown };
  intervention: {
    kind: string;
    actionId: string | null;
    minutes: number;
    variant?: string | null;
    choices?: string[];
    action?: { id?: string; title?: string; short?: string; minutes?: number } | null;
    slots?: Record<string, unknown>;
    [key: string]: unknown;
  };
  explain: { rules: string[]; evidence: BrainEvidence[]; trace?: BrainTraceEntry[]; [key: string]: unknown };
  trace: BrainTraceEntry[];
  // Optional: older servers do not send them. think() keeps them only when well formed.
  trace_layers?: BrainLayerStep[];
  labels?: BrainLabels;
  context?: Record<string, unknown>;
}

// The server's synthetic history (GET /v1/scenario); only the history parts are typed.
export interface BrainScenario {
  today: string;
  arc_start?: string;
  lifelog: BrainLifelogItem[];
  checkins: BrainCheckin[];
  [key: string]: unknown;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface BrainOptions {
  baseUrl?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isTraceEntry = (value: unknown): value is BrainTraceEntry =>
  isObject(value) && typeof value.fn === 'string' && typeof value.input === 'string' && typeof value.output === 'string';

function cleanUrl(raw: string | undefined): string | null {
  const trimmed = (raw ?? '').trim().replace(/\/+$/, '');
  return trimmed === '' ? null : trimmed;
}

// Read at call time so tests (vi.stubEnv) and builds both see the current value.
export function brainUrl(): string | null {
  return cleanUrl(import.meta.env.VITE_BRAIN_URL as string | undefined);
}

export function brainBackupUrl(): string | null {
  return cleanUrl(import.meta.env.VITE_BRAIN_URL_BACKUP as string | undefined);
}

// The configured addresses, primary first, without blanks or duplicates.
export function brainUrls(): string[] {
  return [...new Set([brainUrl(), brainBackupUrl()].filter((u): u is string => Boolean(u)))];
}

// The address that answered last, so the next call starts there.
let preferredBase: string | null = null;

export function resetBrainPreference(): void {
  preferredBase = null;
}

// Minimal shape check of a /v1/think answer: every part the screen reads is there.
// trace_layers and labels are optional and never decide it (see withOptionalParts).
export function isThinkOutput(value: unknown): value is ThinkOutput {
  if (!isObject(value)) return false;
  const { person, state, goal, constraint, monitor, intervention, explain, trace } = value;
  if (![person, state, goal, constraint, monitor, intervention, explain].every(isObject)) return false;
  const s = state as Record<string, unknown>;
  const risk = s.risk;
  if (!isObject(risk) || typeof risk.level !== 'string' || !Array.isArray(risk.reasons)) return false;
  if (!Array.isArray((goal as Record<string, unknown>).milestones)) return false;
  if (typeof (constraint as Record<string, unknown>).constraint !== 'string') return false;
  if (!Array.isArray((monitor as Record<string, unknown>).drift)) return false;
  const iv = intervention as Record<string, unknown>;
  if (typeof iv.kind !== 'string' || typeof iv.minutes !== 'number') return false;
  const ex = explain as Record<string, unknown>;
  if (!Array.isArray(ex.rules) || !Array.isArray(ex.evidence)) return false;
  return Array.isArray(trace) && trace.every(isTraceEntry);
}

const LAYERS: readonly BrainLayer[] = ['L1', 'L2', 'L3', 'L4'];

const optionalText = (value: unknown): string | null =>
  value === undefined || value === null ? '' : typeof value === 'string' ? value : null;

function readLayerStep(value: unknown): BrainLayerStep | null {
  if (!isObject(value)) return null;
  const { layer, stage, label, status, input_summary, output_summary, ms } = value;
  if (typeof layer !== 'string' || !LAYERS.includes(layer as BrainLayer)) return null;
  if (typeof label !== 'string' || label.trim() === '') return null;
  if (status !== 'ran' && status !== 'designed') return null;
  const stageText = optionalText(stage);
  const input = optionalText(input_summary);
  const output = optionalText(output_summary);
  if (stageText === null || input === null || output === null) return null;
  const time = typeof ms === 'number' && Number.isFinite(ms) && ms >= 0 ? ms : null;
  if (ms !== undefined && ms !== null && time === null) return null;
  return { layer: layer as BrainLayer, stage: stageText, label, status, input_summary: input, output_summary: output, ms: time };
}

// trace_layers as sent, or null when it is missing, empty or any step is malformed (the
// panel then shows the fn-level trace instead; the call itself never fails over it).
export function readTraceLayers(value: unknown): BrainLayerStep[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const steps = value.map(readLayerStep);
  return steps.every((s): s is BrainLayerStep => s !== null) ? steps : null;
}

function stringMap(value: unknown): Record<string, string> {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((e): e is [string, string] => typeof e[1] === 'string'));
}

// labels with only its string entries kept, or null when it is not an object at all.
export function readLabels(value: unknown): BrainLabels | null {
  if (!isObject(value)) return null;
  const values = isObject(value.values)
    ? Object.fromEntries(Object.entries(value.values).filter(([, v]) => isObject(v)).map(([k, v]) => [k, stringMap(v)]))
    : {};
  const labels: BrainLabels = { fields: stringMap(value.fields), values };
  if (isObject(value.layers)) {
    const layers = stringMap(value.layers);
    labels.layers = Object.fromEntries(Object.entries(layers).filter(([k]) => LAYERS.includes(k as BrainLayer)));
  }
  return labels;
}

// The answer with trace_layers and labels kept only when they are well formed.
function withOptionalParts(data: ThinkOutput): ThinkOutput {
  const { trace_layers: rawLayers, labels: rawLabels, ...rest } = data;
  const out: ThinkOutput = { ...rest };
  const layers = readTraceLayers(rawLayers);
  const labels = readLabels(rawLabels);
  if (layers) out.trace_layers = layers;
  if (labels) out.labels = labels;
  return out;
}

export function isScenario(value: unknown): value is BrainScenario {
  return (
    isObject(value) &&
    typeof value.today === 'string' &&
    ISO_DATE.test(value.today) &&
    Array.isArray(value.lifelog) &&
    Array.isArray(value.checkins)
  );
}

type Attempt<T> = { ok: true; data: T } | { ok: false; reason: BrainFailure; retry: boolean };

// 4xx means the request itself is wrong, so the other address would answer the same;
// 408 (timeout) and 429 (rate limit) are about this address and are worth retrying.
const retryStatus = (status: number): boolean => status >= 500 || status === 408 || status === 429;

async function attempt<T>(
  url: string,
  init: RequestInit,
  check: (value: unknown) => value is T,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<Attempt<T>> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal });
    if (!res.ok) return { ok: false, reason: 'http_error', retry: retryStatus(res.status) };
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return { ok: false, reason: timedOut ? 'timeout' : 'bad_shape', retry: true };
    }
    return check(body) ? { ok: true, data: body } : { ok: false, reason: 'bad_shape', retry: true };
  } catch {
    return { ok: false, reason: timedOut ? 'timeout' : 'network', retry: true };
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  check: (value: unknown) => value is T,
  options: BrainOptions,
): Promise<BrainResult<T>> {
  const bases = options.baseUrl ? [options.baseUrl] : brainUrls();
  if (bases.length === 0) return { ok: false, reason: 'not_configured' };
  const primary = options.baseUrl ?? brainUrl();
  // Start with the address that answered last, then the others in their usual order.
  const first = preferredBase && bases.includes(preferredBase) ? preferredBase : bases[0];
  const order = [first, ...bases.filter((b) => b !== first)];
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, req) => fetch(input, req));
  let reason: BrainFailure = 'network';
  for (const base of order) {
    const result = await attempt(`${base}${path}`, init, check, fetchImpl, options.timeoutMs ?? BRAIN_TIMEOUT_MS);
    if (result.ok) {
      preferredBase = base;
      return { ok: true, data: result.data, served: base === primary ? 'primary' : 'backup' };
    }
    reason = result.reason;
    if (!result.retry) break;
  }
  return { ok: false, reason };
}

// One brain pass. Never throws. Malformed trace_layers or labels are dropped, not a failure.
export async function think(input: ThinkInput, options: BrainOptions = {}): Promise<BrainResult<ThinkOutput>> {
  const result = await request(
    '/v1/think',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
    isThinkOutput,
    options,
  );
  return result.ok ? { ...result, data: withOptionalParts(result.data) } : result;
}

// The synthetic history, fetched once per page and cached. A failed fetch is not cached,
// so the next Progress visit tries again. Never throws.
let scenarioCache: Promise<BrainResult<BrainScenario>> | null = null;

export function getScenario(options: BrainOptions = {}): Promise<BrainResult<BrainScenario>> {
  if (scenarioCache) return scenarioCache;
  const pending = request('/v1/scenario', { method: 'GET' }, isScenario, options);
  scenarioCache = pending;
  void pending.then((result) => {
    if (!result.ok && scenarioCache === pending) scenarioCache = null;
  });
  return pending;
}

export function resetScenarioCache(): void {
  scenarioCache = null;
}
