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
//   action: Korean sentence shown in the output panel; contains the input when non-empty.
export function decideNextAction(input, rows) {
  const text = normalizeInput(input);
  const usable = Array.isArray(rows) ? rows.filter(isSyntheticRow) : [];
  const base = { input: text, pickedId: null, matchedIds: [], rowCount: usable.length };

  if (text === '') {
    return { ...base, ok: false, reason: 'empty-input', action: '입력이 비어 있습니다. 한 줄을 입력하세요.' };
  }
  if (usable.length === 0) {
    return { ...base, ok: false, reason: 'no-rows', action: `「${text}」 → 불러온 가상 데이터가 없습니다.` };
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
    action: `「${text}」 → 다음 행동: ${picked.goal} (${picked.id} · 상태 ${picked.status})`,
  };
}
