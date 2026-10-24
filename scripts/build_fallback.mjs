// build_fallback.mjs — rebuilds app/fallback.html from the live app (RECOVERY.md "정적 fallback 절차").
// Added in the 2026-10-21 dry-run fix pass ([SIMULATION] findings); holds no simulated results.
//   node scripts/build_fallback.mjs            → writes app/fallback.html, prints the synced line
//   node scripts/build_fallback.mjs <out.html> → writes elsewhere (dry run)
// Steps (the same as the manual procedure): copy index.html · drop the file:// guard <p> and its
// classic <script> (the fallback must open from a double-click, and tests run its FIRST <script>) ·
// inline styles.css · replace the module script with one classic script holding config (fixture
// mode) · fixture.json · logic.js and app.js without `export` · a boot tail that serves the inlined
// fixture and appends ' · 정적 fallback 스냅샷' to #app-source · badge gets ' · 정적 fallback' ·
// synced line with the logic.js / fixture.json hashes (same hashing as app/tests/fallback.test.mjs).
// Zero dependencies (node only). Code comments in English; screen text stays Korean.

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const read = (rel) => readFileSync(join(APP, rel), 'utf8').replace(/\r\n/g, '\n');
const digest = (rel) => createHash('sha256').update(read(rel)).digest('hex').slice(0, 12);
const indent = (text, pad) => text.split('\n').map((l) => (l ? pad + l : l)).join('\n');
const dropExports = (text) => text.replace(/^export /gm, '');

function fail(message) {
  console.error(`build_fallback: ${message}`);
  process.exit(1);
}

const out = process.argv[2] || join(APP, 'fallback.html');
let html = read('index.html');
const css = read('styles.css');
const logic = read('logic.js');
const app = read('app.js');
const fixture = read('data/fixture.json').trim();
const config = read('config.js');

if (/^import /m.test(logic)) fail('logic.js imports another module — inline it by hand or keep logic.js self-contained');
const appBlock = app.match(/\/\/ --- BEGIN app[^\n]*\n([\s\S]*?)\n\/\/ --- END app/);
if (!appBlock) fail('app.js lacks the "// --- BEGIN app" … "// --- END app" markers');
const fixtureUrl = (config.match(/FIXTURE_URL\s*=\s*["']([^"']+)["']/) || [])[1] || 'data/fixture.json';
const synced = `<!-- synced: logic.js sha256=${digest('logic.js')} · fixture.json sha256=${digest('data/fixture.json')} -->`;

// 1. drop the file:// guard and its classic script (index.html only).
const guard = /\n[ \t]*<p id="file-guard"[\s\S]*?<\/p>\s*<script>[\s\S]*?<\/script>/;
if (!guard.test(html)) fail('index.html: #file-guard block not found (if it was removed on purpose, drop this check)');
html = html.replace(guard, '');

// 2. inline the stylesheet and add the header comment + synced line.
const link = /[ \t]*<link rel="stylesheet" href="styles\.css">\n/;
if (!link.test(html)) fail('index.html: <link rel="stylesheet" href="styles.css"> not found');
html = html.replace(link, [
  '  <!-- STATIC FALLBACK SNAPSHOT — works from a double-click (file://): no modules, no fetch, no backend.',
  '       Built by scripts/build_fallback.mjs from index.html + styles.css + logic.js + app.js + data/fixture.json.',
  '       Re-build at the 14:00 freeze and before submit-gate check 8 (RECOVERY.md "정적 fallback 절차"). -->',
  `  ${synced}`,
  '  <style>',
  indent(css.trimEnd(), '    '),
  '  </style>',
  '',
].join('\n'));

// 3. badge suffix.
html = html.replace(/(<p class="badge" id="app-sim-badge">)([^<]*)(<\/p>)/, (m, a, text, c) =>
  (text.includes('정적 fallback') ? m : `${a}${text} · 정적 fallback${c}`));

// 4. one classic script instead of the module.
const script = [
  '  <script>',
  '  (function () {',
  "    'use strict';",
  '',
  '    /* BEGIN config (inlined from config.js; fallback is always fixture mode) */',
  "    var SHEET_API_URL = '';",
  `    var FIXTURE_URL = '${fixtureUrl}';`,
  '    var SHEET_TIMEOUT_MS = 0;',
  '    /* END config */',
  '',
  '    /* BEGIN fixture (inlined from data/fixture.json) */',
  '    var FIXTURE =',
  indent(fixture, '    '),
  '    ;',
  '    /* END fixture */',
  '',
  '    /* BEGIN logic (inlined from logic.js) */',
  indent(dropExports(logic).trimEnd(), '    '),
  '    /* END logic */',
  '',
  '    /* BEGIN app (inlined from app.js) */',
  indent(dropExports(appBlock[1]).trimEnd(), '    '),
  '    /* END app */',
  '',
  '    // Serve the inlined fixture instead of fetching data/fixture.json.',
  '    function inlineFetch() {',
  '      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(FIXTURE); } });',
  '    }',
  '',
  '    boot(document, { sheetUrl: SHEET_API_URL, fixtureUrl: FIXTURE_URL, fetchImpl: inlineFetch, timeoutMs: SHEET_TIMEOUT_MS })',
  '      .then(function (booted) {',
  '        var el = booted.els.source;',
  "        el.textContent = el.textContent + ' · 정적 fallback 스냅샷';",
  '      })',
  '      .catch(function (err) {',
  '        showError(document.getElementById(OPTIONAL_IDS.error), err && err.message ? err.message : String(err));',
  '      });',
  '  })();',
  '  </script>',
].join('\n');
const moduleTag = /[ \t]*<script type="module" src="app\.js"><\/script>/;
if (!moduleTag.test(html)) fail('index.html: <script type="module" src="app.js"></script> not found');
html = html.replace(moduleTag, () => script);

writeFileSync(out, html);
console.log(`wrote ${out}`);
console.log(synced);
