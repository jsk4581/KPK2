// logic.js — pure functions for the demo's one core action.
// ES module with no DOM, no network, no clock: runs unchanged in the browser and in node.
// On event day, Build replaces decideNextAction with PRD sentence 3 (the core action)
// and writes the test in app/tests/logic.test.mjs FIRST (SMOKE.md -> tests -> code).
// fallback.html inlines this file (without the `export` keywords); re-sync it per RECOVERY.md.

export const MAX_INPUT_LENGTH = 200;
export const SYNTHETIC_LABEL = 'synthetic';

// Lower number = more urgent. Unknown statuses sort last.
export const STATUS_PRIORITY = { blocked: 0, in_progress: 1, todo: 2, done: 3 };

// Collapse whitespace, trim, and cap the length. Never throws.
export function normalizeInput(raw) {
  if (raw === null || raw === undefined) return '';
  return String(raw).replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT_LENGTH);
}

// Only rows explicitly labelled synthetic may reach the screen (safety rule 2).
export function isSyntheticRow(row) {
  return Boolean(row) && typeof row === 'object' && row.label === SYNTHETIC_LABEL;
}

// Accepts a bare array, the fixture shape { rows: [...] }, or the Apps Script
// shape { ok: true, rows: [...] }. Throws when the payload reports an error.
export function extractRows(payload) {
  if (Array.isArray(payload)) return payload.filter(isSyntheticRow);
  if (!payload || typeof payload !== 'object') {
    throw new Error('data payload is not an object');
  }
  if (payload.ok === false) {
    throw new Error(String(payload.error || 'data source reported ok=false'));
  }
  if (!Array.isArray(payload.rows)) {
    throw new Error('data payload has no rows array');
  }
  return payload.rows.filter(isSyntheticRow);
}

// Empty or missing URL -> fixture mode. Any non-empty URL -> sheet mode.
export function pickDataSource(sheetUrl) {
  return typeof sheetUrl === 'string' && sheetUrl.trim() !== '' ? 'sheet' : 'fixture';
}

// Text for the data source indicator. Always names the source so a fallback is never silent.
export function describeSource(source, count, note) {
  const base = `데이터: ${source} · synthetic ${count}행`;
  return note ? `${base} · ${note}` : base;
}

// Lowercased search tokens of length >= 2 (drops single-character noise).
export function tokenize(text) {
  return normalizeInput(text)
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter((token) => token.length >= 2);
}

// Number of input tokens found in the row's searchable text.
export function scoreRow(tokens, row) {
  const haystack = [row.id, row.user, row.goal, row.status]
    .map((value) => (value === undefined || value === null ? '' : String(value)))
    .join(' ')
    .toLowerCase();
  return tokens.reduce((score, token) => (haystack.includes(token) ? score + 1 : score), 0);
}

function statusRank(row) {
  const rank = STATUS_PRIORITY[row.status];
  return rank === undefined ? 99 : rank;
}

function compareById(a, b) {
  const left = String(a.id);
  const right = String(b.id);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

// Deterministic ordering: more urgent status first, then id ascending.
export function sortByUrgency(rows) {
  return [...rows].sort((a, b) => statusRank(a) - statusRank(b) || compareById(a, b));
}

// The core action of the generic scaffold: given one line of input and the loaded
// rows, pick the single next action. Same input + same rows -> same object.
//
// Returns { ok, input, reason, action, pickedId, matchedIds, rowCount }
//   reason: 'empty-input' | 'no-rows' | 'match' | 'no-match'
//   action: English sentence shown in the output panel; contains the input when non-empty.
export function decideNextAction(input, rows) {
  const text = normalizeInput(input);
  const usable = Array.isArray(rows) ? rows.filter(isSyntheticRow) : [];
  const base = { input: text, pickedId: null, matchedIds: [], rowCount: usable.length };

  if (text === '') {
    return { ...base, ok: false, reason: 'empty-input', action: 'The input is empty. Type one line.' };
  }
  if (usable.length === 0) {
    return { ...base, ok: false, reason: 'no-rows', action: `"${text}" → No synthetic data loaded.` };
  }

  const tokens = tokenize(text);
  const scored = usable
    .map((row) => ({ row, score: scoreRow(tokens, row) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || statusRank(a.row) - statusRank(b.row) || compareById(a.row, b.row));

  const matched = scored.map((entry) => entry.row);
  const picked = matched.length > 0 ? matched[0] : sortByUrgency(usable)[0];
  const reason = matched.length > 0 ? 'match' : 'no-match';

  return {
    ...base,
    ok: true,
    reason,
    pickedId: String(picked.id),
    matchedIds: matched.map((row) => String(row.id)),
    action: `"${text}" → Next action: ${picked.goal} (${picked.id} · status ${picked.status})`,
  };
}

// ===========================================================================
// Career demo judgment core. Pure and deterministic: no DOM, no network, no clock.
// The web screens and the MCP wrapper share these functions; the LLM only writes
// sentences and never changes a judgment. Input/output shapes: docs/logic-contract.md.
// ===========================================================================

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const NEXT_WEEK = 'NextWeek';
export const ACTION_STATUSES = ['todo', 'done', 'moved'];
export const FIELD_KEYS = ['career', 'now', 'pull'];
export const MAX_ACTION_MINUTES = 30;
export const SHORT_ACTION_MINUTES = 10;

// Lifelog source -> input field it pre-fills when an item has no explicit `field` hint.
// Records of past work feed "career", conversations and notes feed "now", saved links feed "pull".
export const SOURCE_FIELD = {
  calendar: 'career',
  document: 'career',
  photo: 'career',
  note: 'now',
  sms: 'now',
  messenger: 'now',
  saved_link: 'pull',
};

// Most recent items used per field (kept in date order in the text).
export const SUMMARY_ITEMS_PER_FIELD = 4;

export const REST_DAY_LINE = 'Today was a rest day, not a missed day.';
export const REFRAME_LINE = 'Energy goes up and down; the plan bends with it and keeps going.';
export const COMEBACK_LINE = 'Welcome back. Showing up again is the hard part.';

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));
const dayIndex = (day) => WEEK_DAYS.indexOf(day);

function sentence(text) {
  const clean = asText(text).replace(/\s+/g, ' ').trim();
  if (clean === '') return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function compareItems(a, b) {
  const left = `${asText(a.date)}\u0000${asText(a.id)}`;
  const right = `${asText(b.date)}\u0000${asText(b.id)}`;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

// Lifelog items -> the three input fields, using only enabled sources.
// Each field gets the summaries (or titles) of its most recent items, oldest first.
export function summarizeLifelog(items, enabledSources) {
  const enabled = new Set(asArray(enabledSources));
  const buckets = { career: [], now: [], pull: [] };
  const usable = asArray(items)
    .filter((item) => item && typeof item === 'object' && enabled.has(item.source))
    .sort(compareItems);
  for (const item of usable) {
    const field = FIELD_KEYS.includes(item.field) ? item.field : SOURCE_FIELD[item.source];
    if (!field) continue;
    const text = sentence(item.summary) || sentence(item.title);
    if (text) buckets[field].push(text);
  }
  const out = {};
  for (const key of FIELD_KEYS) out[key] = buckets[key].slice(-SUMMARY_ITEMS_PER_FIELD).join(' ');
  return out;
}

// Prefill merge: fields the user edited keep their text, the rest take the fresh summary.
// editedKeys may be an array or a Set of field keys.
export function mergePrefill(current, summary, editedKeys) {
  const edited = new Set(editedKeys instanceof Set ? [...editedKeys] : asArray(editedKeys));
  const base = current && typeof current === 'object' ? current : {};
  const fresh = summary && typeof summary === 'object' ? summary : {};
  const out = {};
  for (const key of FIELD_KEYS) out[key] = edited.has(key) ? asText(base[key]) : asText(fresh[key]);
  return out;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Keyword match at the start of a word, case-insensitive ("interview" matches "interviews",
// "ai" does not match "maintain").
function hasKeyword(haystack, keyword) {
  const word = asText(keyword).trim().toLowerCase();
  if (word === '') return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(word)}`, 'u').test(haystack);
}

// Skills found in the three fields and the enabled lifelog items (title, summary, tags).
// A tag equal to a skill id also counts. Returns sorted, unique skill ids.
export function extractSkills(fields, items, skills) {
  const parts = [];
  if (typeof fields === 'string') parts.push(fields);
  else if (fields && typeof fields === 'object') for (const key of FIELD_KEYS) parts.push(asText(fields[key]));
  const tags = new Set();
  for (const item of asArray(items)) {
    if (!item || typeof item !== 'object') continue;
    parts.push(asText(item.title), asText(item.summary));
    for (const tag of asArray(item.tags)) {
      parts.push(asText(tag));
      tags.add(asText(tag));
    }
  }
  const haystack = parts.join(' \n ').toLowerCase();
  const found = new Set();
  for (const skill of asArray(skills)) {
    if (!skill || typeof skill !== 'object' || !skill.id) continue;
    const id = asText(skill.id);
    if (tags.has(id) || asArray(skill.keywords).some((keyword) => hasKeyword(haystack, keyword))) found.add(id);
  }
  return [...found].sort();
}

function roundRatio(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Overlap of the user's skills with a role's required skills.
// ratio = |user and required| / |required|, 0..1, two decimals. Lists keep the role's order.
export function skillOverlap(userSkillIds, role) {
  const user = new Set(asArray(userSkillIds).map(asText));
  const requires = [...new Set(asArray(role && role.requires).map(asText))];
  const transfers = requires.filter((id) => user.has(id));
  const missing = requires.filter((id) => !user.has(id));
  const ratio = requires.length === 0 ? 0 : roundRatio(transfers.length / requires.length);
  return { ratio, transfers, missing };
}

// Top three roles by overlap ratio; ties keep catalog order.
export function rankRoles(userSkillIds, roles) {
  return asArray(roles)
    .filter((role) => role && typeof role === 'object')
    .map((role, index) => ({ role, index, overlap: skillOverlap(userSkillIds, role) }))
    .sort((a, b) => b.overlap.ratio - a.overlap.ratio || a.index - b.index)
    .slice(0, 3)
    .map(({ role, overlap }) => ({ id: asText(role.id), title: asText(role.title), ...overlap }));
}

// Week summary: "<done>/<total> done", plus " · <n> moved" when n > 0 (NextWeek counts as moved).
export function weekSummary(actions) {
  const list = asArray(actions);
  const done = list.filter((a) => a.status === 'done').length;
  const moved = list.filter((a) => a.status === 'moved').length;
  const base = `${done}/${list.length} done`;
  return moved > 0 ? `${base} · ${moved} moved` : base;
}

function clampMinutes(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return MAX_ACTION_MINUTES;
  return Math.min(MAX_ACTION_MINUTES, n);
}

// A path draft (LLM or fallback) -> this week's state. Takes the first three actions, caps
// minutes at 30, starts every action as todo with 0 moves. Re-choosing a path calls this
// again, which clears every check-in, move, share card and comeback state.
// `today` is kept on the week for reference; check-ins pass their own `today`.
export function buildWeek(pathDraft, today) {
  const draft = pathDraft && typeof pathDraft === 'object' ? pathDraft : {};
  const source = asArray(draft.week && draft.week.actions).length > 0 ? draft.week.actions : asArray(draft.actions);
  const fallbackDay = dayIndex(today) >= 0 ? today : WEEK_DAYS[0];
  const actions = source.slice(0, 3).map((raw, i) => {
    const action = raw && typeof raw === 'object' ? raw : {};
    const title = asText(action.title).trim();
    return {
      id: `a${i + 1}`,
      title,
      minutes: clampMinutes(action.minutes),
      day: dayIndex(action.day) >= 0 ? action.day : fallbackDay,
      status: 'todo',
      moves: 0,
      short: asText(action.short).trim() || title,
    };
  });
  return {
    actions,
    summary: weekSummary(actions),
    pathId: asText(draft.role_id || draft.id),
    pathTitle: asText(draft.title || draft.role_title),
    today: dayIndex(today) >= 0 ? today : null,
    pendingComeback: false,
  };
}

function isCheckable(action) {
  return Boolean(action) && (action.status === 'todo' || action.status === 'moved') && action.day !== NEXT_WEEK;
}

// Actions that show Done / Not today buttons: todo or moved, and not NextWeek.
export function checkableActions(week) {
  return asArray(week && week.actions).filter(isCheckable);
}

function cloneWeek(week) {
  return { ...week, actions: asArray(week.actions).map((a) => ({ ...a })) };
}

function refusal(week, reason) {
  return { ok: false, reason, week, message: '', adjustment: null, shareCard: null, comeback: null };
}

// One check-in. kind "done" | "not_today"; today is the demo day (persona JSON), never the clock.
// Returns { ok, reason, week, message, adjustment, shareCard, comeback }; the input week is not mutated.
// Refusals (ok false, week unchanged): invalid-kind, invalid-today, unknown-action, not-checkable.
export function applyCheckin(week, actionId, kind, today) {
  if (kind !== 'done' && kind !== 'not_today') return refusal(week, 'invalid-kind');
  if (dayIndex(today) < 0) return refusal(week, 'invalid-today');
  const current = asArray(week && week.actions).find((a) => a.id === actionId);
  if (!current) return refusal(week, 'unknown-action');
  if (!isCheckable(current)) return refusal(week, 'not-checkable');

  const next = cloneWeek(week);
  const action = next.actions.find((a) => a.id === actionId);

  if (kind === 'done') {
    const firstDone = !asArray(week.actions).some((a) => a.status === 'done');
    const comeback = week.pendingComeback === true ? COMEBACK_LINE : null;
    action.status = 'done';
    next.pendingComeback = false;
    next.summary = weekSummary(next.actions);
    const progress = weekSummary(next.actions.map((a) => ({ status: a.status === 'done' ? 'done' : 'todo' })));
    const shareCard = firstDone
      ? {
          pathTitle: asText(week.pathTitle),
          actionTitle: action.title,
          progress,
          text: [week.pathTitle ? `Working on: ${week.pathTitle}.` : '', `Just did: ${sentence(action.title)}`, `${progress}.`]
            .filter(Boolean)
            .join(' '),
        }
      : null;
    const message = [`Done: ${sentence(action.title)}`, comeback].filter(Boolean).join('\n');
    return { ok: true, reason: 'done', week: next, message, adjustment: null, shareCard, comeback };
  }

  // Not today: move, never delete.
  const lastIndex = Math.max(...checkableActions(week).map((a) => dayIndex(a.day)));
  const fromIndex = dayIndex(current.day);
  const targetIndex = Math.max(fromIndex, dayIndex(today)) + 1;
  const isLast = fromIndex === lastIndex;
  const toDay = isLast || targetIndex >= WEEK_DAYS.length ? NEXT_WEEK : WEEK_DAYS[targetIndex];

  action.day = toDay;
  action.status = 'moved';
  action.moves = (Number(current.moves) || 0) + 1;
  next.pendingComeback = true;
  next.summary = weekSummary(next.actions);

  const tenMinute = `If you have 10 minutes: ${sentence(current.short || current.title)}`;
  const movedLine = toDay === NEXT_WEEK ? 'Moved to next week' : `Moved to ${toDay}`;
  const adjustment = {
    actionId,
    fromDay: current.day,
    toDay,
    moves: action.moves,
    reason: isLast ? 'last-action' : targetIndex >= WEEK_DAYS.length ? 'past-sunday' : 'next-day',
    restLine: REST_DAY_LINE,
    reframe: REFRAME_LINE,
    tenMinute,
    movedLine,
  };
  const message = [REST_DAY_LINE, REFRAME_LINE, tenMinute, movedLine].join('\n');
  return { ok: true, reason: 'moved', week: next, message, adjustment, shareCard: null, comeback: null };
}

// Actions to show for today's condition (1..5). 1-2 shows each action's 10-minute version;
// 3-5 (or no condition) shows the original. Status, day and id are kept so check-ins still apply.
export function sizeForCondition(week, condition) {
  const reduce = condition === 1 || condition === 2;
  return asArray(week && week.actions).map((a) =>
    reduce
      ? { ...a, title: a.short || a.title, minutes: Math.min(SHORT_ACTION_MINUTES, Number(a.minutes) || SHORT_ACTION_MINUTES), fullTitle: a.title, reduced: true }
      : { ...a, fullTitle: a.title, reduced: false },
  );
}

function dateOrdinal(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asText(date));
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000;
}

export const PROGRESS_RULES = {
  momentum: 'score = 2 x Done + 1 x Not today + lifelog days in the last 7 days of the log (max 3); 6+ strong, 3+ building, else starting',
  dropoutRisk: 'no check-ins yet: medium; latest check-ins end with 2+ Not today: high; with 1: medium; otherwise low',
  daysShownUp: 'distinct days with any check-in (Done or Not today); not a streak',
};

// Progress signals from check-in records ({actionId, kind, day}) and the enabled lifelog items.
// evidence lists exactly what was counted: every check-in, and one item per counted lifelog day.
export function progressSignals(checkins, lifelog) {
  const records = asArray(checkins).filter((c) => c && (c.kind === 'done' || c.kind === 'not_today'));
  const done = records.filter((c) => c.kind === 'done').length;
  const notToday = records.length - done;

  let trailing = 0;
  for (let i = records.length - 1; i >= 0 && records[i].kind === 'not_today'; i -= 1) trailing += 1;
  let dropoutRisk = 'low';
  if (records.length === 0) dropoutRisk = 'medium';
  else if (trailing >= 2) dropoutRisk = 'high';
  else if (trailing === 1) dropoutRisk = 'medium';

  const daysShownUp = new Set(records.map((c) => asText(c.day))).size;

  // Lifelog days: distinct dates within the last 7 days ending at the latest dated item.
  const dated = asArray(lifelog)
    .filter((item) => item && dateOrdinal(item.date) !== null)
    .sort(compareItems);
  const latest = dated.length > 0 ? dateOrdinal(dated[dated.length - 1].date) : null;
  const byDate = new Map();
  for (let i = dated.length - 1; i >= 0; i -= 1) {
    const item = dated[i];
    if (latest - dateOrdinal(item.date) > 6) continue;
    if (!byDate.has(item.date)) byDate.set(item.date, item);
  }
  const countedDays = [...byDate.values()].slice(0, 3);

  const momentumScore = 2 * done + notToday + countedDays.length;
  const momentum = momentumScore >= 6 ? 'strong' : momentumScore >= 3 ? 'building' : 'starting';

  const evidence = [
    ...records.map((c) => ({ type: 'checkin', actionId: asText(c.actionId), kind: c.kind, day: asText(c.day), weight: c.kind === 'done' ? 2 : 1 })),
    ...countedDays.map((item) => ({ type: 'lifelog', id: asText(item.id), date: item.date, source: asText(item.source), title: asText(item.title), weight: 1 })),
  ];

  return { momentum, momentumScore, dropoutRisk, daysShownUp, evidence, rules: { ...PROGRESS_RULES } };
}

const TRACE_TEXT_LIMIT = 240;

function clip(text) {
  return text.length > TRACE_TEXT_LIMIT ? `${text.slice(0, TRACE_TEXT_LIMIT - 3)}...` : text;
}

// Short, never-throwing description of a value for the [Why?] trace.
export function summarizeForTrace(value) {
  try {
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return clip(JSON.stringify(value));
    if (Array.isArray(value)) {
      const inner = value.slice(0, 5).map((v) => (typeof v === 'object' && v !== null ? (v.id ? asText(v.id) : '{...}') : asText(v)));
      return clip(`[${value.length}: ${inner.join(', ')}${value.length > 5 ? ', ...' : ''}]`);
    }
    if (value && typeof value === 'object') {
      const parts = Object.keys(value).slice(0, 8).map((key) => {
        const v = value[key];
        if (Array.isArray(v)) return `${key}: [${v.length}]`;
        if (v && typeof v === 'object') return `${key}: {...}`;
        return `${key}: ${typeof v === 'string' ? JSON.stringify(v.length > 40 ? `${v.slice(0, 37)}...` : v) : asText(v)}`;
      });
      return clip(`{${parts.join(', ')}}`);
    }
    return clip(asText(value));
  } catch {
    return '(unprintable)';
  }
}

// Wrap a pure function so each call also returns a trace entry for the [Why?] panel:
// withTrace(name, fn, { input?, output?, via? })(...args) -> { result, trace: { fn, input, output, via } }.
// The result is exactly fn(...args); only steps that actually ran produce a trace.
export function withTrace(name, fn, options) {
  const opts = options && typeof options === 'object' ? options : {};
  return (...args) => {
    const result = fn(...args);
    const input = typeof opts.input === 'function' ? asText(opts.input(...args)) : args.map(summarizeForTrace).join(', ');
    const output = typeof opts.output === 'function' ? asText(opts.output(result)) : summarizeForTrace(result);
    return { result, trace: { fn: asText(name), input: clip(input), output: clip(output), via: opts.via || 'logic' } };
  };
}
