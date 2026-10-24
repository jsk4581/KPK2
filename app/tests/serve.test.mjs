// serve.test.mjs — scripts/serve.mjs serves app/ over http (so modules load) and nothing outside it.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';

import { createStaticServer, resolveInside, APP_ROOT } from '../../scripts/serve.mjs';

function get(port, path) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] || '', body }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('scripts/serve.mjs', () => {
  let server;
  let port;

  before(async () => {
    server = createStaticServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  test('serves the app and the browser runner', async () => {
    const page = await get(port, '/');
    assert.equal(page.status, 200);
    assert.match(page.body, /id="app-form"/);
    const runner = await get(port, '/tests/');
    assert.equal(runner.status, 200);
    assert.match(runner.body, /스모크 러너/);
  });

  test('serves ES modules as JavaScript', async () => {
    const mod = await get(port, '/logic.js');
    assert.equal(mod.status, 200);
    assert.match(mod.type, /^text\/javascript/);
  });

  test('never serves files outside app/', async () => {
    const res = await get(port, '/%2e%2e/CONTRACT.md');
    assert.equal(res.status, 403);
    assert.equal(resolveInside(APP_ROOT, '/../HANDOFF.md'), null);
    assert.equal((await get(port, '/no-such-file.txt')).status, 404);
  });
});
