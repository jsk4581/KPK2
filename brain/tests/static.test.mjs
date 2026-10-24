// static.test.mjs — serveStatic serves only brain/mcp/public, never escapes it, and the
// Brain Explorer page it serves is self-contained (inline JS <= 400 lines, no CDN).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { PUBLIC_DIR, isStaticRoute, contentTypeOf, resolvePublicPath, serveStatic } from '../mcp/static.js';

const BRAIN_DIR = resolve(PUBLIC_DIR, '..', '..');
let server;
let base;

before(async () => {
  server = createServer((req, res) => {
    serveStatic(req, res, { root: PUBLIC_DIR }).catch(() => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise((done) => server.close(() => done()));
});

// node:http sends the request target verbatim (fetch would normalise "/../" away first).
function rawGet(path, method = 'GET') {
  return new Promise((done, fail) => {
    const req = request(`${base}${path}`, { method, path }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', fail);
    req.end();
  });
}

test('the public dir and the traversal target both exist (so the 404 below is a refusal, not a miss)', () => {
  assert.ok(existsSync(resolve(PUBLIC_DIR, 'explorer.html')));
  assert.ok(existsSync(resolve(BRAIN_DIR, 'package.json')));
  assert.equal(resolve(PUBLIC_DIR, '..', '..', 'package.json'), resolve(BRAIN_DIR, 'package.json'));
});

test('GET /explorer → 200 text/html with the explorer page', async () => {
  const res = await fetch(`${base}/explorer`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  const html = await res.text();
  assert.match(html, /Dream Achieve Moments — Decision Brain/);
  assert.equal(Number(res.headers.get('content-length')), Buffer.byteLength(html));
});

test('GET / and GET /public/explorer.html serve the same page', async () => {
  const [root, direct] = await Promise.all([fetch(`${base}/`), fetch(`${base}/public/explorer.html`)]);
  assert.equal(root.status, 200);
  assert.equal(direct.status, 200);
  assert.equal(await root.text(), await direct.text());
});

test('HEAD /explorer → 200 with headers and no body', async () => {
  const res = await rawGet('/explorer', 'HEAD');
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(res.text, '');
});

test('GET /../../package.json → 404 (raw dot segments, encoded dots and encoded slashes)', async () => {
  for (const path of [
    '/../../package.json',
    '/public/../../package.json',
    '/public/%2e%2e/%2e%2e/package.json',
    '/public/..%2f..%2fpackage.json',
    '/%2e%2e%2f%2e%2e%2fpackage.json',
    '/public/..%5c..%5cpackage.json'
  ]) {
    const res = await rawGet(path);
    assert.equal(res.status, 404, path);
    const body = JSON.parse(res.text);
    assert.equal(body.error.code, 'not_found');
    assert.doesNotMatch(res.text, /"name"\s*:\s*"dream-achieve-moments-brain"/, `${path} leaked package.json`);
    assert.doesNotMatch(res.text, new RegExp(BRAIN_DIR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${path} leaked a filesystem path`);
  }
});

test('unknown file, directory and NUL byte → 404 with the shared error shape', async () => {
  for (const path of ['/nope', '/public/nope.css', '/public/', '/public', '/explorer/', '/public/%00explorer.html']) {
    const res = await rawGet(path);
    assert.equal(res.status, 404, path);
    assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
    const body = JSON.parse(res.text);
    assert.equal(body.error.code, 'not_found');
    assert.equal(typeof body.error.message, 'string');
  }
});

test('POST /explorer → 405 with Allow', async () => {
  const res = await fetch(`${base}/explorer`, { method: 'POST', body: '{}' });
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'GET, HEAD, OPTIONS');
  assert.equal((await res.json()).error.code, 'method_not_allowed');
});

test('resolvePublicPath keeps every answer inside root or returns null', () => {
  const root = PUBLIC_DIR;
  assert.equal(resolvePublicPath('/', root), resolve(root, 'explorer.html'));
  assert.equal(resolvePublicPath('/explorer', root), resolve(root, 'explorer.html'));
  assert.equal(resolvePublicPath('/public/a/b.css', root), resolve(root, 'a', 'b.css'));
  assert.equal(resolvePublicPath('/explorer.html', root), resolve(root, 'explorer.html'));
  for (const bad of ['', '/public/../x', '/../package.json', '/public/%2e%2e/x', '/public/%zz', '/public/a\0b', '/public/..\\x', '/public/', '/public']) {
    assert.equal(resolvePublicPath(bad, root), null, JSON.stringify(bad));
  }
  const deep = resolvePublicPath('/public/a/../../explorer.html', root);
  assert.ok(deep === null || deep.startsWith(root + sep));
});

test('isStaticRoute and contentTypeOf', () => {
  assert.equal(isStaticRoute('/'), true);
  assert.equal(isStaticRoute('/explorer'), true);
  assert.equal(isStaticRoute('/public/x.css'), true);
  assert.equal(isStaticRoute('/v1/health'), false);
  assert.equal(isStaticRoute('/mcp'), false);
  assert.equal(isStaticRoute('/publicx'), false);
  assert.equal(contentTypeOf('a.html'), 'text/html; charset=utf-8');
  assert.equal(contentTypeOf('a.JS'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeOf('a.css'), 'text/css; charset=utf-8');
  assert.equal(contentTypeOf('a.bin'), 'application/octet-stream');
});

test('explorer.html is self-contained: inline JS <= 400 lines, no external CDN, no forbidden words', () => {
  const html = readFileSync(resolve(PUBLIC_DIR, 'explorer.html'), 'utf8');
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length >= 1, 'has an inline script');
  const jsLines = scripts.reduce((n, m) => n + m[1].split('\n').filter((l) => l.trim() !== '').length, 0);
  assert.ok(jsLines <= 400, `inline JS is ${jsLines} lines (limit 400)`);
  assert.doesNotMatch(html, /<script[^>]*\ssrc=/i, 'no external scripts');
  assert.doesNotMatch(html, /<link[^>]*\shref=\s*["']?https?:/i, 'no external stylesheets');
  assert.doesNotMatch(html, /@import\s+url\(/i, 'no CSS imports');
  // Vendor-name guard, assembled from fragments so the word itself never appears in the repo.
  assert.doesNotMatch(html, new RegExp(['gem', 'ini'].join('') + '|' + ['제미', '나이'].join(''), 'i'), 'no model vendor names');
  assert.doesNotMatch(html, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no email addresses');
  for (const path of ['/v1/scenario', '/v1/think', '/v1/check-in', '/v1/agent/chat', '/v1/usage', '/v1/health']) {
    assert.ok(html.includes(path), `calls ${path}`);
  }
  assert.ok(html.includes('X-Partner-Key'), 'sends X-Partner-Key');
});
