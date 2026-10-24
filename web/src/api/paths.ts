import persona from '@app/data/persona-dana.json';
import type { Day, DraftAction, Fields, PathDraft, PathsResponse } from '../state/types';

export interface PathsRequestRole {
  id: string;
  title: string;
  transfers: string[];
  missing: string[];
}

export interface PathsRequest {
  fields: Fields;
  roles: PathsRequestRole[];
}

export const PATHS_ENDPOINT = '/api/paths';
// The server function gives Claude 12 seconds; the browser waits a little longer
// so a server-side fallback still arrives before the browser gives up.
export const CLIENT_TIMEOUT_MS = 15000;

const PLAN_DAYS: readonly string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_MINUTES = 30;

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

function isDraftAction(value: unknown): value is DraftAction {
  if (!value || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  return (
    isText(a.title) &&
    typeof a.minutes === 'number' &&
    Number.isFinite(a.minutes) &&
    a.minutes > 0 &&
    a.minutes <= MAX_MINUTES &&
    typeof a.day === 'string' &&
    PLAN_DAYS.includes(a.day) &&
    isText(a.short)
  );
}

// Shape check for one path draft (LLM or fallback). Sentences only: the judgment
// (which roles, overlap) never comes from here.
export function isValidPathDraft(value: unknown): value is PathDraft {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  const week = p.week as Record<string, unknown> | undefined;
  return (
    isText(p.role_id) &&
    isText(p.one_liner) &&
    Array.isArray(p.first_two_weeks) &&
    p.first_two_weeks.length > 0 &&
    p.first_two_weeks.every(isText) &&
    Boolean(week) &&
    typeof week === 'object' &&
    Array.isArray(week.actions) &&
    week.actions.length >= 3 &&
    week.actions.every(isDraftAction) &&
    isText(p.arc_12w)
  );
}

// Paths for exactly the given role ids, in that order. Null when any role is missing or malformed.
export function selectPaths(paths: unknown, roleIds: string[]): PathDraft[] | null {
  if (!Array.isArray(paths) || roleIds.length === 0) return null;
  const out: PathDraft[] = [];
  for (const id of roleIds) {
    const found = paths.find((p) => p && typeof p === 'object' && (p as PathDraft).role_id === id);
    if (!isValidPathDraft(found)) return null;
    out.push(found);
  }
  return out;
}

const PERSONA_FALLBACK = (persona.fallback.paths as unknown[]).map((p) => p as PathDraft);

// The labelled offline answer from the synthetic persona, for the ranked roles in rank order.
export function fallbackPaths(roleIds: string[]): PathsResponse {
  const paths = roleIds
    .map((id) => PERSONA_FALLBACK.find((p) => p.role_id === id))
    .filter((p): p is PathDraft => Boolean(p))
    .map((p) => ({
      ...p,
      first_two_weeks: [...p.first_two_weeks],
      week: { actions: p.week.actions.map((a) => ({ ...a, day: a.day as Day })) },
    }));
  return { source: 'fallback', paths };
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface FetchPathsOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

// POST /api/paths. Throws on network error, timeout, non-2xx or an unknown response shape.
export async function fetchPaths(body: PathsRequest, options: FetchPathsOptions = {}): Promise<PathsResponse> {
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? CLIENT_TIMEOUT_MS);
  try {
    const res = await fetchImpl(PATHS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`paths endpoint answered ${res.status}`);
    const data = (await res.json()) as Record<string, unknown> | null;
    if (!data || (data.source !== 'llm' && data.source !== 'fallback') || !Array.isArray(data.paths)) {
      throw new Error('paths endpoint answered an unknown shape');
    }
    return { source: data.source, paths: data.paths as PathDraft[] };
  } finally {
    clearTimeout(timer);
  }
}

export interface ResolvedPaths {
  response: PathsResponse;
  // Plain-language account of where the sentences came from, for the [Why?] trace.
  note: string;
}

// Never throws. The answer always covers exactly the ranked roles, and anything other
// than a valid LLM answer is labelled "fallback" so the screen can say so.
export async function resolvePaths(body: PathsRequest, options: FetchPathsOptions = {}): Promise<ResolvedPaths> {
  const roleIds = body.roles.map((r) => r.id);
  let answer: PathsResponse;
  try {
    answer = await fetchPaths(body, options);
  } catch {
    return { response: fallbackPaths(roleIds), note: 'server unreachable, browser used the sample output' };
  }
  const selected = selectPaths(answer.paths, roleIds);
  if (answer.source === 'llm' && selected) {
    return { response: { source: 'llm', paths: selected }, note: 'server drafted the sentences with the LLM' };
  }
  if (answer.source === 'fallback' && selected) {
    return { response: { source: 'fallback', paths: selected }, note: 'server answered with the sample output' };
  }
  return { response: fallbackPaths(roleIds), note: 'server answer did not match the format, browser used the sample output' };
}
