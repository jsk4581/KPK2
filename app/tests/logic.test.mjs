// logic.test.mjs — T2 harness invariants for app/. Run from the repo root: node --test app/tests
// Order on event day: app/SMOKE.md first, then tests (red), then code (green).
// Covers what stays true whatever the core action is: data loading, public-demo rules, the SMOKE
// steps' shape on a fake DOM, file structure, X-2/X-4, the file:// guards and a PII scan.
// The skeleton's own core action (tokenize, sortByUrgency, decideNextAction, its labels and fixture
// columns) is tested in scaffold-core.test.mjs — Build REPLACES that file on event day (never deletes
// tests here to get green). The static fallback lives in fallback.test.mjs.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import vm from 'node:vm';

// Import the module object, not named bindings: a named import of an export that does not exist
// yet (TDD red) is a SyntaxError for the whole file, so every test in it would vanish.
import * as logic from '../logic.js';
import { SHEET_API_URL, FIXTURE_URL } from '../config.js';
import { ELEMENT_IDS, OPTIONAL_IDS, INITIAL_OUTPUT, boot, loadRows } from '../app.js';
import { SMOKE_INPUT } from './smoke-input.js';

const { normalizeInput, isSyntheticRow, extractRows, pickDataSource, describeSource, MAX_INPUT_LENGTH } = logic;

const APP_DIR = fileURLToPath(new URL('../', import.meta.url));
// CRLF -> LF so a Windows checkout (core.autocrlf) does not turn heading regexes red.
const read = (rel) => readFileSync(join(APP_DIR, rel), 'utf8').replace(/\r\n/g, '\n');
const FIXTURE = JSON.parse(read('data/fixture.json'));
const FIXTURE_ROWS = FIXTURE.rows;

// HANDOFF.md front matter: X-2/X-4 against mission/PRD.md are NOT_RUN (skipped, with a reason) from
// G1 until Build's T3 rewrites SMOKE.md — i.e. while stage is intake/decide/board and SMOKE.md does
// not yet name the mission PRD version ("PRD v<n>" on its target line). Red there is expected, not a bug.
function handoffHeader(key) {
  const path = join(APP_DIR, '..', 'HANDOFF.md');
  if (!existsSync(path)) return '';
  const line = readFileSync(path, 'utf8').split('\n').slice(0, 30).find((l) => l.startsWith(`${key}:`));
  return line ? line.slice(key.length + 1).trim() : '';
}

// ---------- fake DOM (just enough for app.js) ----------

function fakeElement(tag, id) {
  return {
    tagName: String(tag).toUpperCase(),
    id: id || '',
    value: '',
    textContent: '',
    dataset: {},
    children: [],
    listeners: {},
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    dispatch(type) {
      const event = { type, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      for (const fn of this.listeners[type] || []) fn(event);
      return event;
    },
    replaceChildren(...nodes) { this.children = nodes; },
  };
}

function fakeDocument(ids = Object.values(ELEMENT_IDS)) {
  const byId = Object.fromEntries(ids.map((id) => [id, fakeElement('div', id)]));
  return {
    byId,
    getElementById: (id) => byId[id] || null,
    createElement: (tag) => fakeElement(tag),
  };
}

function okResponse(body) {
  return { ok: true, status: 200, json: async () => body };
}

// Serves app files by relative URL, like a static host would.
async function fileFetch(url) {
  const rel = String(url).replace(/^\.\//, '');
  if (!existsSync(join(APP_DIR, rel))) return { ok: false, status: 404, json: async () => ({}) };
  return okResponse(JSON.parse(read(rel)));
}

const failingFetch = async () => { throw new Error('network down'); };

// ---------- PRD sentence frames (v1.1 amendment B2) for the X-2 / X-4 check ----------

const PRD_FRAMES = [
  /^1\. 사용자는 (.+) 한 명입니다\.$/,
  /^2\. 이 사람은 (.+) 때문에 불편합니다\.$/,
  /^3\. 이 도구의 핵심 행동은 (.+) 하나입니다\.$/,
  /^4\. (.+?)(을|를) 넣으면 (.+?)(을|를|이|가) (보여줍니다|보여 줍니다|표시합니다)\.$/,
  /^5\. 오늘은 ([^,，]+), ([^,，]+), ([^,，]+)(을|를) 하지 않습니다\.$/,
  /^6\. (.+)하면 완료입니다\.$/,
];

// The PRD that app/SMOKE.md must quote: the team's mission/PRD.md once it exists (event day),
// otherwise the pre-event skeleton PRD in app/tests/scaffold-prd.md.
const MISSION_PRD = join(APP_DIR, '..', 'mission', 'PRD.md');

// Parses the active PRD; captures[i] holds the groups of sentence i+1 (only when it fullmatches).
function scaffoldPrd() {
  const fromMission = existsSync(MISSION_PRD);
  const text = fromMission
    ? readFileSync(MISSION_PRD, 'utf8').replace(/\r\n/g, '\n')
    : read('tests/scaffold-prd.md');
  return { text, captures: prdCaptures(text), source: fromMission ? 'mission/PRD.md' : 'app/tests/scaffold-prd.md' };
}

// Skip reason while SMOKE.md is not yet aligned to the team's mission/PRD.md (G1 → T3), else false.
function x2x4Pending() {
  if (!existsSync(MISSION_PRD)) return false;
  const version = (readFileSync(MISSION_PRD, 'utf8').match(/^버전: (v\d+)/m) || [])[1];
  const early = ['intake', 'decide', 'board'].includes(handoffHeader('stage'));
  const aligned = version && read('SMOKE.md').includes(`PRD ${version}`);
  return early && !aligned
    ? `NOT_RUN — mission/PRD.md ${version || ''} 이후 Build T3(10:45)가 SMOKE.md를 맞추기 전 (stage ${handoffHeader('stage')}). 예상된 red, 버그 아님`
    : false;
}
const X2X4_PENDING = x2x4Pending();

function prdCaptures(text) {
  const lines = text.split('\n').map((line) => line.trim());
  const captures = [];
  for (const frame of PRD_FRAMES) {
    const hit = lines.map((line) => line.match(frame)).find(Boolean);
    if (hit) captures.push(hit.slice(1));
  }
  return captures;
}

// Body of numbered step n (up to the next numbered step or H2).
function smokeStep(smoke, n) {
  const m = smoke.match(new RegExp(`^${n}\\. [\\s\\S]*?(?=^\\d+\\. |^## |(?![\\s\\S]))`, 'm'));
  return m ? m[0] : '';
}

// Body of an H2 section (up to the next H2).
function smokeSection(smoke, title) {
  const m = smoke.match(new RegExp(`^## ${title}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  return m ? m[1] : '';
}

// ---------- logic.js ----------

describe('logic: normalizeInput', () => {
  test('trims and collapses whitespace', () => {
    assert.equal(normalizeInput('  a \n\t b  '), 'a b');
  });
  test('null/undefined become empty string', () => {
    assert.equal(normalizeInput(null), '');
    assert.equal(normalizeInput(undefined), '');
  });
  test('caps length', () => {
    assert.equal(normalizeInput('x'.repeat(MAX_INPUT_LENGTH + 50)).length, MAX_INPUT_LENGTH);
  });
  test('non-strings are stringified', () => {
    assert.equal(normalizeInput(42), '42');
  });
});

describe('logic: data helpers', () => {
  test('isSyntheticRow accepts only label=synthetic', () => {
    assert.equal(isSyntheticRow({ label: 'synthetic' }), true);
    assert.equal(isSyntheticRow({ label: 'real' }), false);
    assert.equal(isSyntheticRow({}), false);
    assert.equal(isSyntheticRow(null), false);
  });
  test('extractRows reads fixture shape, Apps Script shape and bare arrays', () => {
    assert.equal(extractRows(FIXTURE).length, FIXTURE_ROWS.length);
    assert.equal(extractRows({ ok: true, sheet: 'demo', rows: FIXTURE_ROWS }).length, FIXTURE_ROWS.length);
    assert.equal(extractRows(FIXTURE_ROWS).length, FIXTURE_ROWS.length);
  });
  test('extractRows drops rows that are not synthetic', () => {
    const rows = [...FIXTURE_ROWS, { id: 'x-1', goal: 'not labelled', status: 'todo' }];
    assert.equal(extractRows({ rows }).length, FIXTURE_ROWS.length);
  });
  test('extractRows throws on error payloads', () => {
    assert.throws(() => extractRows({ ok: false, error: 'Sheet not found' }), /Sheet not found/);
    assert.throws(() => extractRows({ ok: true }), /no rows/);
    assert.throws(() => extractRows('nope'), /not an object/);
  });
  test('pickDataSource: empty -> fixture, URL -> sheet', () => {
    assert.equal(pickDataSource(''), 'fixture');
    assert.equal(pickDataSource('   '), 'fixture');
    assert.equal(pickDataSource(undefined), 'fixture');
    assert.equal(pickDataSource('https://script.google.com/macros/s/X/exec'), 'sheet');
  });
  test('describeSource names the source and the fallback note', () => {
    assert.equal(describeSource('fixture', 5), '데이터: fixture · synthetic 5행');
    assert.match(describeSource('fixture', 5, 'sheet 실패'), /fixture.*sheet 실패/);
  });
});

// ---------- data files ----------

describe('data: fixture.json and config.js', () => {
  test('fixture is labelled synthetic at file and row level', () => {
    assert.equal(FIXTURE._label, 'synthetic');
    assert.match(FIXTURE._note, /\[SIMULATION\]/);
    assert.ok(FIXTURE_ROWS.length >= 1);
    for (const row of FIXTURE_ROWS) {
      assert.equal(row.label, 'synthetic', `row ${row.id} must be synthetic`);
      assert.ok('id' in row, 'every row has an id');
    }
  });
  test('fixture ids are unique', () => {
    const ids = FIXTURE_ROWS.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  // Sheet mode reads rows seeded by app/sheet/Code.gs; if fixture.json gains columns the seed must too,
  // or sheet mode silently breaks SMOKE step 3. Checked only while sheet mode is on.
  test('sheet seed (app/sheet/Code.gs) has every fixture column when sheet mode is on',
    { skip: SHEET_API_URL.trim() ? false : 'NOT_RUN — sheet 모드 꺼짐 (config.js SHEET_API_URL 비어 있음)' }, () => {
      const seed = read('sheet/Code.gs').match(/var headers = \[([^\]]*)\]/);
      assert.ok(seed, 'seedSyntheticSheet headers line');
      const headers = [...seed[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
      for (const key of Object.keys(FIXTURE_ROWS[0])) assert.ok(headers.includes(key), `Code.gs seed lacks column ${key}`);
    });
  test('config: SHEET_API_URL is a string; FIXTURE_URL points to an existing file', () => {
    assert.equal(typeof SHEET_API_URL, 'string');
    assert.ok(existsSync(join(APP_DIR, FIXTURE_URL)), `${FIXTURE_URL} exists`);
  });
});

// ---------- loadRows ----------

describe('app: loadRows', () => {
  test('fixture mode', async () => {
    const r = await loadRows({ sheetUrl: '', fixtureUrl: FIXTURE_URL, fetchImpl: fileFetch });
    assert.equal(r.source, 'fixture');
    assert.equal(r.rows.length, FIXTURE_ROWS.length);
    assert.equal(r.note, '');
  });
  test('sheet mode reads the Apps Script shape and drops unlabelled rows', async () => {
    const sheetFetch = async () => okResponse({ ok: true, sheet: 'demo', rows: [...FIXTURE_ROWS, { id: 'z', goal: 'x' }] });
    const r = await loadRows({ sheetUrl: 'https://example.invalid/exec', fixtureUrl: FIXTURE_URL, fetchImpl: sheetFetch });
    assert.equal(r.source, 'sheet');
    assert.equal(r.rows.length, FIXTURE_ROWS.length);
  });
  test('sheet failure falls back to fixture and says so (no silent degrade)', async () => {
    const mixed = async (url) => (String(url).startsWith('https://') ? failingFetch() : fileFetch(url));
    const r = await loadRows({ sheetUrl: 'https://example.invalid/exec', fixtureUrl: FIXTURE_URL, fetchImpl: mixed });
    assert.equal(r.source, 'fixture');
    assert.equal(r.rows.length, FIXTURE_ROWS.length);
    assert.match(r.note, /sheet 실패 → fixture 대체/);
  });
  test('sheet ok=false falls back with the error text', async () => {
    const mixed = async (url) => (String(url).startsWith('https://') ? okResponse({ ok: false, error: 'Sheet not found' }) : fileFetch(url));
    const r = await loadRows({ sheetUrl: 'https://example.invalid/exec', fixtureUrl: FIXTURE_URL, fetchImpl: mixed });
    assert.equal(r.source, 'fixture');
    assert.match(r.note, /Sheet not found/);
  });
  test('fixture failure returns zero rows with a note, never throws', async () => {
    const r = await loadRows({ sheetUrl: '', fixtureUrl: 'data/missing.json', fetchImpl: fileFetch });
    assert.equal(r.rows.length, 0);
    assert.match(r.note, /fixture 로드 실패/);
  });
});

// ---------- SMOKE 3 steps on a fake DOM (mirrors app/SMOKE.md and tests/index.html) ----------

describe('SMOKE (fake DOM): index.html + app.js', () => {
  const html = read('index.html');

  test('step 1: page has a title, a heading and every app element', () => {
    assert.match(html, /<title>[^<\s][^<]*<\/title>/);
    assert.match(html, /<h1[^>]*>[^<\s][^<]*<\/h1>/);
    for (const id of Object.values(ELEMENT_IDS)) assert.match(html, new RegExp(`id="${id}"`), `#${id} in index.html`);
    assert.match(html, /<script type="module" src="app\.js"><\/script>/);
    // The run button is found by id and type, not by its label (the label is mission-specific).
    assert.match(html, /id="app-run"[^>]*type="submit"|type="submit"[^>]*id="app-run"/);
  });

  test('step 2: SMOKE_INPUT + run -> the output changes, no reload', async () => {
    const doc = fakeDocument();
    const { els } = await boot(doc, { sheetUrl: '', fetchImpl: fileFetch });
    els.input.value = SMOKE_INPUT;
    const event = els.form.dispatch('submit');
    assert.equal(event.defaultPrevented, true, 'form submit must not reload the page');
    assert.ok(els.output.textContent.length > 0 && els.output.textContent !== INITIAL_OUTPUT, els.output.textContent);
  });

  test('step 3: fixture rows load and the indicator says fixture', async () => {
    const doc = fakeDocument();
    const { els } = await boot(doc, { sheetUrl: '', fetchImpl: fileFetch });
    assert.equal(els.source.dataset.state, 'ready');
    assert.equal(els.source.dataset.source, 'fixture');
    assert.equal(els.source.dataset.count, String(FIXTURE_ROWS.length));
    assert.match(els.source.textContent, /fixture/);
    assert.equal(els.rows.children.length, FIXTURE_ROWS.length);
    assert.ok(els.rows.children.every((li) => li.tagName === 'LI' && li.textContent.length > 0));
  });

  test('boot fails loudly when an element is missing', async () => {
    const doc = fakeDocument(Object.values(ELEMENT_IDS).filter((id) => id !== 'app-output'));
    await assert.rejects(boot(doc, { sheetUrl: '', fetchImpl: fileFetch }), /#app-output/);
  });

  test('public demo: reset button returns to the first screen, data kept', async () => {
    const doc = fakeDocument([...Object.values(ELEMENT_IDS), ...Object.values(OPTIONAL_IDS)]);
    const { els } = await boot(doc, { sheetUrl: '', fetchImpl: fileFetch });
    els.input.value = SMOKE_INPUT;
    els.form.dispatch('submit');
    assert.notEqual(els.output.textContent, INITIAL_OUTPUT);
    doc.byId['app-reset'].dispatch('click');
    assert.equal(els.input.value, '');
    assert.equal(els.output.textContent, INITIAL_OUTPUT);
    assert.equal(els.output.dataset.reason, 'reset');
    assert.equal(els.rows.children.length, FIXTURE_ROWS.length, 'reset keeps the loaded rows');
  });

  test('public demo: error banner stays hidden when data loads, shows the reason when it fails', async () => {
    const ok = fakeDocument([...Object.values(ELEMENT_IDS), ...Object.values(OPTIONAL_IDS)]);
    await boot(ok, { sheetUrl: '', fetchImpl: fileFetch });
    assert.equal(ok.byId['app-error'].hidden, true);

    const bad = fakeDocument([...Object.values(ELEMENT_IDS), ...Object.values(OPTIONAL_IDS)]);
    await boot(bad, { sheetUrl: 'https://example.invalid/exec', fetchImpl: failingFetch, timeoutMs: 0 });
    assert.equal(bad.byId['app-error'].hidden, false);
    assert.match(bad.byId['app-error'].textContent, /오류: .*sheet 실패/);
  });

  test('public demo controls are optional (older snapshots without them still boot)', async () => {
    const doc = fakeDocument();
    const { extra } = await boot(doc, { sheetUrl: '', fetchImpl: fileFetch });
    assert.equal(extra.reset, null);
    assert.equal(extra.error, null);
  });

  test('index.html has the reset button and a hidden error banner', () => {
    assert.match(html, /id="app-reset"[^>]*type="button"|type="button"[^>]*id="app-reset"/);
    assert.match(html, /id="app-error"[^>]*hidden/);
  });

  test('index.html loads nothing from the network', () => {
    assert.doesNotMatch(html, /(src|href)="https?:/);
  });

  test('index.html warns on file:// with a classic (non-module) script', () => {
    const classic = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
    assert.match(classic, /location\.protocol === 'file:'/);
    assert.match(html, /id="file-guard"[^>]*hidden/);
    assert.match(html, /fallback\.html/);
  });
});

// ---------- documents and browser runner ----------

describe('docs: SMOKE.md, RECOVERY.md, DEPLOY.md', () => {
  test('SMOKE.md: # SMOKE -> 3 numbered steps (each 기대:) -> ## 완료 조건 -> ## 실행 기록', () => {
    const smoke = read('SMOKE.md');
    assert.match(smoke.split('\n')[0], /^# SMOKE\b/, 'first line is "# SMOKE ..."');
    // Required H2s in order, each exactly once; extra H2s (e.g. "## 단계" from templates/SMOKE.md) are allowed.
    const h2 = [...smoke.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    const required = h2.filter((title) => ['완료 조건', '실행 기록'].includes(title));
    assert.deepEqual(required, ['완료 조건', '실행 기록'], 'required H2s, in this order, no duplicates');
    const steps = smoke.slice(0, smoke.indexOf('\n## 완료 조건'));
    assert.equal((steps.match(/^\d+\. /gm) || []).length, 3, 'exactly 3 numbered steps before 완료 조건');
    assert.equal((steps.match(/기대:/g) || []).length, 3, 'one 기대: per step');
    assert.match(smoke, /^\| 회차 \| 시각 \| 통과 단계 \| 실패 \| 조치 \|$/m);
    assert.ok(smokeStep(smoke, 2).includes(SMOKE_INPUT), 'step 2 uses the same input as SMOKE_INPUT in the tests');
  });
  test('active PRD (mission/PRD.md, else app/tests/scaffold-prd.md) matches the v1.1 sentence frames', () => {
    const prd = scaffoldPrd();
    // The skeleton PRD is an example and must say so; the team's mission/PRD.md is real.
    if (prd.source === 'app/tests/scaffold-prd.md') assert.ok(prd.text.split('\n')[0].includes('[SIMULATION]'));
    assert.match(prd.text, /^버전: v\d+ \(\d{2}:\d{2}\)$/m, `C-P4 version line in ${prd.source}`);
    assert.equal(prd.captures.length, 6, `all six sentences in ${prd.source} fullmatch their frame`);
    for (const caps of prd.captures) {
      for (const cap of caps) assert.doesNotMatch(cap, /^<.*>$|______|TBD|\[예시\]/, `placeholder capture "${cap}"`);
    }
  });
  test('X-2: PRD sentence 3 capture appears verbatim in SMOKE step 2', { skip: X2X4_PENDING }, () => {
    const prd = scaffoldPrd();
    const core = prd.captures[2][0];
    assert.ok(smokeStep(read('SMOKE.md'), 2).includes(core), `step 2 contains "${core}" (${prd.source})`);
  });
  test('X-4: PRD sentence 6 capture appears verbatim in SMOKE ## 완료 조건', { skip: X2X4_PENDING }, () => {
    const prd = scaffoldPrd();
    const done = prd.captures[5][0];
    assert.ok(smokeSection(read('SMOKE.md'), '완료 조건').includes(done), `완료 조건 contains "${done}" (${prd.source})`);
  });
  test('X-2/X-4 mutation: a SMOKE without the PRD texts is caught', () => {
    const prd = scaffoldPrd();
    const core = prd.captures[2][0];
    const done = prd.captures[5][0];
    const broken = read('SMOKE.md').split(core).join('핵심 장면').split(done).join('결과 표시');
    assert.ok(!smokeStep(broken, 2).includes(core), 'X-2 must fail on the mutated SMOKE');
    assert.ok(!smokeSection(broken, '완료 조건').includes(done), 'X-4 must fail on the mutated SMOKE');
  });
  test('X-2/X-4 on an event-day pair (good-01 fixture PRD + SMOKE) — the mission/PRD.md path', () => {
    const dir = join(APP_DIR, '..', 'tests', 'fixtures', 'missions', 'good-01');
    const caps = prdCaptures(readFileSync(join(dir, 'PRD.md'), 'utf8').replace(/\r\n/g, '\n'));
    const smoke = readFileSync(join(dir, 'app', 'SMOKE.md'), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(caps.length, 6);
    assert.ok(smokeStep(smoke, 2).includes(caps[2][0]), 'X-2 on the fixture pair');
    assert.ok(smokeSection(smoke, '완료 조건').includes(caps[5][0]), 'X-4 on the fixture pair');
  });
  test('RECOVERY.md: three redeploy paths, last good commit slot, fallback procedure', () => {
    const rec = read('RECOVERY.md');
    for (const needle of ['GitHub Pages', 'Vercel', '로컬 파일', '마지막 정상 커밋', 'fallback.html', '5분',
      'git tag good-', 'ZIP', '재배포 실측', '마지막 수단']) {
      assert.ok(rec.includes(needle), `RECOVERY.md mentions ${needle}`);
    }
  });
  test('DEPLOY.md: default stack and Firebase switch conditions', () => {
    const dep = read('DEPLOY.md');
    assert.match(dep, /^## 기본 스택/m);
    assert.match(dep, /^## Firebase 전환 조건/m);
  });
  test('DEPLOY.md: public demo operation (no login, reset, error banner, other device, no browser API key, empty-app path)', () => {
    const dep = read('DEPLOY.md');
    assert.match(dep, /^## 공개 데모 운영/m);
    for (const needle of ['로그인 없음', '초기화', '오류 배너', '다른 기기', 'API 키', 'Apps Script 프록시', '사전 생성', '빈 앱']) {
      assert.ok(dep.includes(needle), `DEPLOY.md mentions ${needle}`);
    }
  });
});

describe('browser runner: tests/index.html', () => {
  const runner = read('tests/index.html');

  test('imports ../logic.js and the shared smoke input, targets ../index.html', () => {
    assert.match(runner, /from '\.\.\/logic\.js'/);
    assert.match(runner, /import \{ SMOKE_INPUT \} from '\.\/smoke-input\.js'/);
    assert.match(runner, /'\.\.\/index\.html'/);
  });
  test('uses only element ids that exist in index.html', () => {
    const html = read('index.html');
    const used = [...runner.matchAll(/getElementById\('(app-[a-z-]+)'\)/g)].map((m) => m[1]);
    assert.ok(used.length >= 5);
    for (const id of used) assert.match(html, new RegExp(`id="${id}"`), `#${id}`);
  });
  test('declares no smoke input of its own (smoke-input.js is the only copy)', () => {
    assert.doesNotMatch(runner, /const SMOKE_INPUT\s*=/);
  });
  test('inline script compiles', () => {
    const script = runner.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
    const body = script.replace(/^\s*import[^;]+;\s*$/gm, '');
    assert.doesNotThrow(() => new vm.Script(`(async () => {\n${body}\n})`));
  });
  test('dependency-free: no external scripts or styles', () => {
    assert.doesNotMatch(runner, /(src|href)="https?:/);
  });
  test('file:// guard and 5 s watchdog run before the module (no silent hang)', () => {
    const classicAt = runner.indexOf('<script>');
    const moduleAt = runner.indexOf('<script type="module">');
    assert.ok(classicAt > 0 && classicAt < moduleAt, 'classic guard script precedes the module');
    const classic = runner.slice(classicAt, moduleAt);
    assert.match(classic, /location\.protocol === 'file:'/);
    assert.match(classic, /dataset\.result = 'fail'/);
    assert.match(classic, /setTimeout\([\s\S]*5000\)/);
    assert.match(classic, /dataset\.started/);
    assert.match(runner.slice(moduleAt), /document\.body\.dataset\.started = '1'/);
  });
  test('classic guard script compiles', () => {
    const classic = runner.match(/<script>([\s\S]*?)<\/script>/)[1];
    assert.doesNotThrow(() => new vm.Script(classic));
  });
});

// ---------- privacy ----------

describe('privacy: app/ has no contact details or secrets', () => {
  const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  const PHONE_KR = /(?<!\d)01[016789][-. ]?\d{3,4}[-. ]?\d{4}(?!\d)/;
  // Built from pieces so this file does not trip the repo-wide secret scan itself.
  const SECRET = new RegExp(['sk-' + 'ant-', 'AI' + 'za', 'gh' + 'p_', '-----' + 'BEGIN'].join('|'));

  function walk(dir) {
    return readdirSync(dir).flatMap((name) => {
      if (name === 'node_modules' || name.startsWith('.')) return [];
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  }

  test('no email, Korean phone number or secret pattern in app files', () => {
    const files = walk(APP_DIR).filter((f) => /\.(html|js|mjs|css|json|md|gs)$/.test(f));
    assert.ok(files.length > 0);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      assert.doesNotMatch(text, EMAIL, `email-like text in ${file}`);
      assert.doesNotMatch(text, PHONE_KR, `phone-like text in ${file}`);
      assert.doesNotMatch(text, SECRET, `secret-like text in ${file}`);
    }
  });
});

// ---------- test entry ----------

describe('tests/index.js entry', () => {
  test('imports every *.test.mjs so `node --test app/tests` skips nothing', () => {
    const entry = read('tests/index.js');
    const testFiles = readdirSync(join(APP_DIR, 'tests')).filter((name) => name.endsWith('.test.mjs'));
    assert.ok(testFiles.length >= 1);
    for (const name of testFiles) assert.ok(entry.includes(`import './${name}';`), `tests/index.js imports ${name}`);
  });
});
