// scaffold-core.test.mjs — tests of the SKELETON's core action only (pre-event scaffold).
// Added in the 2026-10-21 dry-run fix pass ([SIMULATION] findings); holds no simulated results.
// On event day Build REPLACES this file with the tests of the PRD sentence-3 core action
// (same file name, new content — red first, then green). These tests are not harness rules:
// replacing them is the TDD step, not "deleting tests to get green" (app/tests/README.md).
// Harness invariants (data loading, public-demo rules, X-2/X-4, privacy) stay in logic.test.mjs.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Module object, not named imports: a missing export must fail one test, not the whole file.
import * as logic from '../logic.js';
import { ELEMENT_IDS, boot } from '../app.js';
import { SMOKE_INPUT } from './smoke-input.js';

const APP_DIR = fileURLToPath(new URL('../', import.meta.url));
const read = (rel) => readFileSync(join(APP_DIR, rel), 'utf8').replace(/\r\n/g, '\n');
const FIXTURE_ROWS = JSON.parse(read('data/fixture.json')).rows;
const { tokenize, sortByUrgency, decideNextAction } = logic;

function fakeElement(tag, id) {
  return {
    tagName: String(tag).toUpperCase(), id: id || '', value: '', textContent: '', dataset: {}, children: [], listeners: {},
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); },
    dispatch(type) {
      const event = { type, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      for (const fn of this.listeners[type] || []) fn(event);
      return event;
    },
    replaceChildren(...nodes) { this.children = nodes; },
  };
}

function fakeDocument() {
  const byId = Object.fromEntries(Object.values(ELEMENT_IDS).map((id) => [id, fakeElement('div', id)]));
  return { byId, getElementById: (id) => byId[id] || null, createElement: (tag) => fakeElement(tag) };
}

async function fileFetch(url) {
  const rel = String(url).replace(/^\.\//, '');
  if (!existsSync(join(APP_DIR, rel))) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => JSON.parse(read(rel)) };
}

describe('scaffold: helpers of the skeleton core action', () => {
  test('tokenize drops 1-char tokens and punctuation', () => {
    assert.deepEqual(tokenize('Pitch, deck! a 준비'), ['pitch', 'deck', '준비']);
  });
  test('sortByUrgency: in_progress before todo before done, then id; input not mutated', () => {
    const before = JSON.stringify(FIXTURE_ROWS);
    assert.deepEqual(sortByUrgency(FIXTURE_ROWS).map((r) => r.id), ['syn-002', 'syn-005', 'syn-004', 'syn-001', 'syn-003']);
    assert.equal(JSON.stringify(FIXTURE_ROWS), before);
  });
  test('fixture rows carry the skeleton columns', () => {
    for (const row of FIXTURE_ROWS) {
      for (const key of ['id', 'user', 'goal', 'status', 'updated_at']) assert.ok(key in row, `row ${row.id} has ${key}`);
    }
  });
});

describe('scaffold: decideNextAction (skeleton core action)', () => {
  test('empty input -> ok=false, empty-input', () => {
    const r = decideNextAction('   ', FIXTURE_ROWS);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'empty-input');
    assert.equal(r.pickedId, null);
  });
  test('no rows -> ok=false, no-rows, output still contains the input', () => {
    const r = decideNextAction(SMOKE_INPUT, []);
    assert.equal(r.reason, 'no-rows');
    assert.ok(r.action.includes(SMOKE_INPUT));
  });
  test('matching input picks the best-scoring row', () => {
    const r = decideNextAction('pitch deck', FIXTURE_ROWS);
    assert.equal(r.ok, true);
    assert.equal(r.reason, 'match');
    assert.equal(r.pickedId, 'syn-004');
    assert.deepEqual(r.matchedIds, ['syn-004']);
    assert.ok(r.action.includes('pitch deck'));
  });
  test('score ties break by urgency, then id', () => {
    // "synthetic" appears only in syn-003's goal (the label column is not searched).
    assert.equal(decideNextAction('synthetic', FIXTURE_ROWS).pickedId, 'syn-003');
    // "agent" hits every row's user -> tie -> most urgent (in_progress) with lowest id.
    const r = decideNextAction('agent', FIXTURE_ROWS);
    assert.equal(r.pickedId, 'syn-002');
    assert.deepEqual(r.matchedIds, ['syn-002', 'syn-005', 'syn-004', 'syn-001', 'syn-003']);
  });
  test('no match falls back to the most urgent row', () => {
    const r = decideNextAction(SMOKE_INPUT, FIXTURE_ROWS);
    assert.equal(r.reason, 'no-match');
    assert.equal(r.pickedId, 'syn-002');
    assert.ok(r.action.includes(SMOKE_INPUT), 'SMOKE step 2: output contains the input');
  });
  test('non-synthetic rows are ignored', () => {
    const r = decideNextAction('secret', [{ id: 'real-1', goal: 'secret plan', status: 'todo' }]);
    assert.equal(r.reason, 'no-rows');
  });
  test('deterministic and pure: same input -> same object, rows untouched', () => {
    const before = JSON.stringify(FIXTURE_ROWS);
    const a = decideNextAction('viewport layout', FIXTURE_ROWS);
    const b = decideNextAction('viewport layout', FIXTURE_ROWS);
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(FIXTURE_ROWS), before);
  });
  test('result has the documented shape', () => {
    const r = decideNextAction('wireframe', FIXTURE_ROWS);
    assert.deepEqual(Object.keys(r).sort(), ['action', 'input', 'matchedIds', 'ok', 'pickedId', 'reason', 'rowCount']);
    assert.equal(r.rowCount, FIXTURE_ROWS.length);
  });
});

describe('scaffold: SMOKE step 2 and labels of the skeleton screen', () => {
  test('step 2: SMOKE_INPUT + 핵심 행동 -> output contains the input (reason no-match)', async () => {
    const doc = fakeDocument();
    const { els } = await boot(doc, { sheetUrl: '', fetchImpl: fileFetch });
    els.input.value = SMOKE_INPUT;
    els.form.dispatch('submit');
    assert.ok(els.output.textContent.includes(SMOKE_INPUT), els.output.textContent);
    assert.equal(els.output.dataset.reason, 'no-match');
  });
  test('button labels 핵심 행동 and 초기화', () => {
    const html = read('index.html');
    assert.match(html, />핵심 행동</);
    assert.match(html, />초기화</);
  });
});
