// app.js — DOM binding for index.html. Keeps no logic of its own: decisions live in logic.js.
// Exports are importable in node (no document access at import time) so app/tests can drive
// the same three SMOKE steps against a fake DOM. The block between the BEGIN/END markers is
// inlined into fallback.html; keep it free of `import.meta` and module-only syntax.

import { SHEET_API_URL, FIXTURE_URL, SHEET_TIMEOUT_MS } from './config.js';
import { decideNextAction, describeSource, extractRows, pickDataSource } from './logic.js';

// --- BEGIN app (inlined into fallback.html) ---

// Element ids shared by index.html, fallback.html, tests/index.html and logic.test.mjs.
export const ELEMENT_IDS = {
  form: 'app-form',
  input: 'app-input',
  button: 'app-run',
  output: 'app-output',
  source: 'app-source',
  rows: 'app-rows',
};

// Optional public-demo controls (app/DEPLOY.md "공개 데모 운영"). Looked up with getElementById and
// skipped when absent, so older snapshots such as fallback.html keep working without them.
export const OPTIONAL_IDS = {
  reset: 'app-reset',
  error: 'app-error',
};

export const INITIAL_OUTPUT = '아직 실행하지 않았습니다.';

export function getElements(doc) {
  const els = {};
  for (const [key, id] of Object.entries(ELEMENT_IDS)) {
    const el = doc.getElementById(id);
    if (!el) throw new Error(`missing element #${id}`);
    els[key] = el;
  }
  return els;
}

export function getOptionalElements(doc) {
  const els = {};
  for (const [key, id] of Object.entries(OPTIONAL_IDS)) els[key] = doc.getElementById(id) || null;
  return els;
}

// Error banner: visible text whenever something failed, hidden otherwise. Never silent.
export function showError(errorEl, message) {
  if (!errorEl) return;
  errorEl.textContent = message ? `오류: ${message} — 화면을 새로고침하거나 「초기화」를 누르세요.` : '';
  errorEl.hidden = !message;
}

// Back to the first screen for the next judge: empty input, initial output, data kept.
export function resetView(els) {
  els.input.value = '';
  els.output.textContent = INITIAL_OUTPUT;
  els.output.dataset.reason = 'reset';
}

async function fetchJson(fetchImpl, url, timeoutMs) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller && timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Returns { source, rows, note }. Never throws: a failed sheet falls back to the fixture
// and says so in `note` (no silent degrade); a failed fixture returns zero rows with a note.
export async function loadRows({ sheetUrl, fixtureUrl, fetchImpl, timeoutMs }) {
  const doFetch = fetchImpl || globalThis.fetch;
  let note = '';
  if (pickDataSource(sheetUrl) === 'sheet') {
    try {
      const rows = extractRows(await fetchJson(doFetch, sheetUrl.trim(), timeoutMs));
      return { source: 'sheet', rows, note };
    } catch (err) {
      note = `sheet 실패 → fixture 대체 (${err && err.message ? err.message : err})`;
    }
  }
  try {
    const rows = extractRows(await fetchJson(doFetch, fixtureUrl, timeoutMs));
    return { source: 'fixture', rows, note };
  } catch (err) {
    const reason = `fixture 로드 실패 (${err && err.message ? err.message : err})`;
    return { source: 'fixture', rows: [], note: note ? `${note} · ${reason}` : reason };
  }
}

// Rows are rendered with textContent only: the sheet is a public, writable endpoint.
export function renderRows(doc, listEl, rows) {
  const items = rows.map((row) => {
    const li = doc.createElement('li');
    li.textContent = `${row.id} · ${row.goal} · ${row.status}`;
    return li;
  });
  listEl.replaceChildren(...items);
}

export function renderSource(sourceEl, loaded) {
  sourceEl.textContent = describeSource(loaded.source, loaded.rows.length, loaded.note);
  sourceEl.dataset.source = loaded.source;
  sourceEl.dataset.count = String(loaded.rows.length);
  sourceEl.dataset.state = 'ready';
}

export function runCoreAction(els, rows) {
  const result = decideNextAction(els.input.value, rows);
  els.output.textContent = result.action;
  els.output.dataset.reason = result.reason;
  return result;
}

// Wires the form, then loads data. Resolves to { els, state } once the data is on screen.
export async function boot(doc, options = {}) {
  const els = getElements(doc);
  const state = { rows: [], source: null };

  const extra = getOptionalElements(doc);

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    runCoreAction(els, state.rows);
  });
  if (extra.reset) extra.reset.addEventListener('click', () => resetView(els));

  els.source.dataset.state = 'loading';
  els.source.textContent = '데이터: 불러오는 중…';

  const loaded = await loadRows({
    sheetUrl: options.sheetUrl !== undefined ? options.sheetUrl : SHEET_API_URL,
    fixtureUrl: options.fixtureUrl || FIXTURE_URL,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs !== undefined ? options.timeoutMs : SHEET_TIMEOUT_MS,
  });
  state.rows = loaded.rows;
  state.source = loaded.source;
  renderRows(doc, els.rows, loaded.rows);
  renderSource(els.source, loaded);
  showError(extra.error, loaded.note);
  return { els, state, extra };
}

// --- END app ---

// Auto-start only in a real page that has the app form (never in node).
if (typeof document !== 'undefined' && document.getElementById(ELEMENT_IDS.form)) {
  boot(document).catch((err) => {
    showError(document.getElementById(OPTIONAL_IDS.error), err && err.message ? err.message : String(err));
  });
}
