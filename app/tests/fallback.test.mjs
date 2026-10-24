// fallback.test.mjs — the static fallback (app/fallback.html), file:// safe.
// Always checked: self-contained, carries a synced line, and boots on its OWN inlined data with no
// network (rows = its inlined fixture, the run button changes the output).
// Everything that compares it with the live app — same ids as index.html, same title, same fixture,
// same output as the live app for SMOKE_INPUT and PARITY_INPUTS — runs only while the "synced" line
// matches logic.js / fixture.json. During the build window (10:30–14:00) those tests SKIP with the
// line to paste, so changing fixture.json, ids or the core action never turns node red. Re-sync is
// required at the 14:00 freeze (node scripts/build_fallback.mjs) and for submit-gate check 8: a SKIP
// there is not a PASS.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import vm from 'node:vm';

import { ELEMENT_IDS, INITIAL_OUTPUT, boot } from '../app.js';
import { SMOKE_INPUT, PARITY_INPUTS } from './smoke-input.js';

const APP_DIR = fileURLToPath(new URL('../', import.meta.url));
const read = (rel) => readFileSync(join(APP_DIR, rel), 'utf8').replace(/\r\n/g, '\n');
const FIXTURE = JSON.parse(read('data/fixture.json'));

const digest = (rel) => createHash('sha256').update(read(rel)).digest('hex').slice(0, 12);
const MARKER_RE = /<!-- synced: logic\.js sha256=([0-9a-f]{12}) · fixture\.json sha256=([0-9a-f]{12}) -->/;
const EXPECTED_MARKER = `<!-- synced: logic.js sha256=${digest('logic.js')} · fixture.json sha256=${digest('data/fixture.json')} -->`;

const html = read('fallback.html');
const marker = html.match(MARKER_RE);
const synced = Boolean(marker) && marker[0] === EXPECTED_MARKER;
const STALE = synced ? false
  : `fallback.html is stale (logic.js or fixture.json changed). Rebuild: node scripts/build_fallback.mjs (or RECOVERY.md by hand, synced line ${EXPECTED_MARKER}) — required at the 14:00 freeze and for submit-gate #8`;

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

// Ids are read from the fallback itself, so a stale snapshot with older ids still boots here.
function fakeDocument(ids) {
  const byId = Object.fromEntries(ids.map((id) => [id, fakeElement('div', id)]));
  return { byId, getElementById: (id) => byId[id] || null, createElement: (tag) => fakeElement(tag) };
}

const htmlIds = (source) => [...source.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);

// The app script of the fallback: the classic <script> that holds the BEGIN app block (not a guard).
function appScript(source) {
  const scripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  return scripts.find((s) => s.includes('/* BEGIN app')) || scripts[0] || '';
}

async function settle(isReady) {
  for (let i = 0; i < 50 && !isReady(); i += 1) await new Promise((resolve) => setImmediate(resolve));
}

async function bootFallback() {
  const doc = fakeDocument(htmlIds(html));
  const context = vm.createContext({ document: doc, setTimeout, clearTimeout, AbortController });
  vm.runInContext(appScript(html), context);
  await settle(() => doc.byId['app-source'].dataset.state === 'ready');
  return doc;
}

async function fileFetch(url) {
  const rel = String(url).replace(/^\.\//, '');
  return { ok: true, status: 200, json: async () => JSON.parse(read(rel)) };
}

const run = (doc, input) => {
  doc.byId['app-input'].value = input;
  doc.byId['app-form'].dispatch('submit');
  return { text: doc.byId['app-output'].textContent, reason: doc.byId['app-output'].dataset.reason };
};

function block(source, name) {
  const m = source.match(new RegExp(`/\\* BEGIN ${name}[^*]*\\*/([\\s\\S]*?)/\\* END ${name} \\*/`));
  assert.ok(m, `fallback.html has a BEGIN/END ${name} block`);
  return m[1];
}

const plain = (value) => JSON.parse(JSON.stringify(value));

describe('fallback.html (static snapshot, file:// safe)', () => {
  test('self-contained: no modules, no external files', () => {
    assert.doesNotMatch(html, /type="module"/);
    assert.doesNotMatch(html, /<script[^>]+src=/);
    assert.doesNotMatch(html, /<link[^>]+stylesheet/);
    assert.doesNotMatch(html, /(src|href)="https?:/);
  });

  test('carries a synced line (logic.js and fixture.json hashes)', () => {
    assert.ok(marker, 'fallback.html needs "<!-- synced: logic.js sha256=… · fixture.json sha256=… -->"');
  });

  test('has no file:// guard (it must open from a double-click)', () => {
    assert.doesNotMatch(html, /id="file-guard"/);
  });

  test('boots on its own inlined data without any network (3 SMOKE steps, own snapshot)', async () => {
    const inlined = JSON.parse(block(html, 'fixture').replace(/^\s*var FIXTURE =/, '').replace(/;\s*$/, ''));
    const doc = await bootFallback();
    const source = doc.byId['app-source'];
    assert.equal(source.dataset.state, 'ready');
    assert.equal(source.dataset.source, 'fixture');
    assert.match(source.textContent, /fixture.*정적 fallback/);
    assert.equal(doc.byId['app-rows'].children.length, inlined.rows.length);
    const before = doc.byId['app-output'].textContent;
    const { text } = run(doc, SMOKE_INPUT);
    assert.ok(text.length > 0 && text !== before, 'the run button changes the output');
  });
});

describe('fallback.html parity with the live app (only while synced)', () => {
  test('has the same element ids as index.html', { skip: STALE }, () => {
    for (const id of Object.values(ELEMENT_IDS)) assert.match(html, new RegExp(`id="${id}"`));
  });

  test('same title as index.html', { skip: STALE }, () => {
    const title = (s) => s.match(/<title>([^<]*)<\/title>/)[1];
    assert.equal(title(html), title(read('index.html')));
  });

  test('inlined fixture equals data/fixture.json', { skip: STALE }, () => {
    const inlined = JSON.parse(block(html, 'fixture').replace(/^\s*var FIXTURE =/, '').replace(/;\s*$/, ''));
    assert.deepEqual(inlined, FIXTURE);
  });

  test('same screen output as the live app for SMOKE_INPUT and PARITY_INPUTS', { skip: STALE }, async () => {
    const fallback = await bootFallback();
    const live = fakeDocument(Object.values(ELEMENT_IDS));
    await boot(live, { sheetUrl: '', fetchImpl: fileFetch });
    assert.notEqual(run(live, SMOKE_INPUT).text, INITIAL_OUTPUT);
    for (const input of PARITY_INPUTS) {
      assert.deepEqual(plain(run(fallback, input)), plain(run(live, input)), `input "${input}"`);
    }
    assert.equal(fallback.byId['app-rows'].children.length, live.byId['app-rows'].children.length);
  });
});
