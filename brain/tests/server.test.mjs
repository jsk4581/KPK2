// server.test.mjs — MCP + REST server with a FAKE brain (no index.js needed).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createBrainServer, TOOL_NAMES, SCENARIO_URI } from '../mcp/server.js';
import { startHttp } from '../mcp/http.js';

const scenario = {
  _label: 'synthetic',
  _note: 'Sample persona — synthetic. Fake scenario for the server test.',
  days: [{ day: 1, condition: 4 }]
};

const calls = [];
const fakeBrain = {
  think: (input) => {
    calls.push(['think', input]);
    return { intervention: { kind: 'full', actionId: 'a1' }, echo: input };
  },
  rankRoles: () => [{ id: 'messaging-consultant', ratio: 0.67 }],
  planWeek: (input) => ({ actions: [], today: input.today }),
  checkIn: (input) => ({ ok: true, reason: input.kind }),
  analyzeState: () => ({ risk: { level: 'green', points: 0, reasons: [] } }),
  explain: () => ({ evidence: ['l01'], rules: ['risk_table'] }),
  scenario
};

const silent = () => {};
let open;
let base;
let tokenServer;
let strictServer;

before(async () => {
  open = await startHttp({
    brainServerFactory: () => createBrainServer(fakeBrain),
    brain: fakeBrain,
    port: 0,
    log: silent,
    rateLimit: { limit: 1000, windowMs: 60_000 }
  });
  base = open.url;
  tokenServer = await startHttp({
    brainServerFactory: () => createBrainServer(fakeBrain),
    brain: fakeBrain,
    port: 0,
    token: 'demo-secret',
    log: silent
  });
  strictServer = await startHttp({
    brainServerFactory: () => createBrainServer(fakeBrain),
    brain: fakeBrain,
    port: 0,
    corsOrigins: ['https://allowed.example'],
    rateLimit: { limit: 2, windowMs: 60_000 },
    log: silent
  });
});

after(async () => {
  await Promise.all([open.close(), tokenServer.close(), strictServer.close()]);
});

test('GET /v1/health → 200 with tool list and CORS header', async () => {
  const res = await fetch(`${base}/v1/health`, { headers: { Origin: 'https://demo.example' } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://demo.example');
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.name, 'dream-achieve-moments-brain');
  assert.match(body.version, /^\d+\.\d+\.\d+/);
  assert.deepEqual(body.tools, ['think', 'rank_roles', 'plan_week', 'check_in', 'analyze_state', 'explain', 'get_scenario']);
  assert.equal(typeof body.uptimeSec, 'number');
});

test('health without Origin still answers with Access-Control-Allow-Origin: *', async () => {
  const res = await fetch(`${base}/v1/health`);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

test('OPTIONS preflight → 204 with allow headers', async () => {
  const res = await fetch(`${base}/v1/think`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://demo.example', 'Access-Control-Request-Method': 'POST' }
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-methods'), 'GET,POST,DELETE,OPTIONS');
  assert.match(res.headers.get('access-control-allow-headers'), /Authorization/);
  assert.match(res.headers.get('access-control-allow-headers'), /Mcp-Session-Id/);
  assert.equal(res.headers.get('access-control-expose-headers'), 'Mcp-Session-Id');
  assert.equal(res.headers.get('access-control-max-age'), '600');
});

test('POST /v1/think echoes the fake brain result', async () => {
  const payload = { today: 'Thu', condition: 3, checkins: [{ actionId: 'a1', kind: 'done', day: 'Thu' }] };
  const res = await fetch(`${base}/v1/think`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.intervention, { kind: 'full', actionId: 'a1' });
  assert.equal(body.echo.today, 'Thu');
  assert.equal(body.echo.condition, 3);
  assert.deepEqual(body.echo.checkins, payload.checkins);
  assert.deepEqual(body.echo.lifelog, []);
});

test('POST /v1/rank-roles returns a non-object result as-is', async () => {
  const res = await fetch(`${base}/v1/rank-roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { career: 'x', now: 'y', pull: 'z' } })
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), [{ id: 'messaging-consultant', ratio: 0.67 }]);
});

test('GET /v1/scenario → scenario JSON', async () => {
  const res = await fetch(`${base}/v1/scenario`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), scenario);
});

test('invalid JSON → 400 { error: { code, message } }', async () => {
  const res = await fetch(`${base}/v1/think`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ not json'
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, 'invalid_json');
  assert.equal(typeof body.error.message, 'string');
});

test('invalid input shape → 400 invalid_input', async () => {
  const res = await fetch(`${base}/v1/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week: {}, actionId: 'a1', kind: 'skip', today: 'Thu' })
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, 'invalid_input');
  assert.match(body.error.message, /kind/);
});

test('70KB body → 413', async () => {
  const big = JSON.stringify({ fields: { career: 'x'.repeat(70 * 1024) } });
  const res = await fetch(`${base}/v1/think`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: big
  });
  assert.equal(res.status, 413);
  const body = await res.json();
  assert.equal(body.error.code, 'payload_too_large');
});

test('brain errors → 500 without a stack trace', async () => {
  const throwing = { ...fakeBrain, explain: () => { throw new Error('boom'); } };
  const srv = await startHttp({ brainServerFactory: () => createBrainServer(throwing), brain: throwing, port: 0, log: silent });
  try {
    const res = await fetch(`${srv.url}/v1/explain`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), { error: { code: 'brain_error', message: 'boom' } });
    assert.doesNotMatch(text, /at .*\.js:\d+/);
  } finally {
    await srv.close();
  }
});

test('MCP initialize via raw JSON-RPC POST → serverInfo.name dream-achieve-moments-brain', async () => {
  const res = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } }
    })
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  const message = await readJsonRpc(res);
  assert.equal(message.id, 1);
  assert.equal(message.result.serverInfo.name, 'dream-achieve-moments-brain');
  assert.ok(message.result.capabilities.tools);
});

test('MCP POST with invalid JSON → 400 JSON-RPC parse error', async () => {
  const res = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: 'nope'
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, -32700);
});

test('GET /mcp → 405 (stateless, no SSE stream)', async () => {
  const res = await fetch(`${base}/mcp`, { headers: { Accept: 'text/event-stream' } });
  assert.equal(res.status, 405);
});

test('tools/list via SDK Client + StreamableHTTPClientTransport → 7 tools', async () => {
  const client = new Client({ name: 'server-test', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`));
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name), TOOL_NAMES);
    assert.equal(tools.length, 7);
    for (const tool of tools) assert.equal(tool.inputSchema.type, 'object');

    const think = await client.callTool({ name: 'think', arguments: { today: 'Thu', condition: 2 } });
    assert.equal(think.isError, undefined);
    assert.equal(think.content[0].type, 'text');
    assert.deepEqual(JSON.parse(think.content[0].text), think.structuredContent);
    assert.deepEqual(think.structuredContent.intervention, { kind: 'full', actionId: 'a1' });
    assert.equal(think.structuredContent.echo.condition, 2);

    const ranked = await client.callTool({ name: 'rank_roles', arguments: {} });
    assert.deepEqual(ranked.structuredContent, { result: [{ id: 'messaging-consultant', ratio: 0.67 }] });

    const got = await client.callTool({ name: 'get_scenario', arguments: {} });
    assert.deepEqual(got.structuredContent, scenario);

    const { resources } = await client.listResources();
    assert.ok(resources.some((resource) => resource.uri === SCENARIO_URI));
    const read = await client.readResource({ uri: SCENARIO_URI });
    assert.deepEqual(JSON.parse(read.contents[0].text), scenario);

    const { prompts } = await client.listPrompts();
    assert.ok(prompts.some((prompt) => prompt.name === 'brain-dump'));
    const prompt = await client.getPrompt({ name: 'brain-dump', arguments: { career: 'copywriter', now: 'rates down', pull: 'teaching' } });
    assert.match(prompt.messages[0].content.text, /rank_roles/);
    assert.match(prompt.messages[0].content.text, /copywriter/);
  } finally {
    await client.close();
  }
});

test('tool error from the brain → isError without a stack', async () => {
  const throwing = { ...fakeBrain, checkIn: () => { throw new Error('bad week'); } };
  const srv = await startHttp({ brainServerFactory: () => createBrainServer(throwing), brain: throwing, port: 0, log: silent });
  const client = new Client({ name: 'server-test', version: '0.0.0' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(`${srv.url}/mcp`)));
    const out = await client.callTool({ name: 'check_in', arguments: { week: {}, actionId: 'a1', kind: 'done', today: 'Thu' } });
    assert.equal(out.isError, true);
    assert.deepEqual(JSON.parse(out.content[0].text), { error: { code: 'brain_error', message: 'bad week' } });
  } finally {
    await client.close();
    await srv.close();
  }
});

test('token mode: 401 without header, 200 with bearer, health stays open', async () => {
  const url = tokenServer.url;
  const noHeader = await fetch(`${url}/v1/think`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(noHeader.status, 401);
  assert.equal((await noHeader.json()).error.code, 'unauthorized');
  assert.match(noHeader.headers.get('www-authenticate'), /Bearer/);

  const mcpNoHeader = await fetch(`${url}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })
  });
  assert.equal(mcpNoHeader.status, 401);

  const wrong = await fetch(`${url}/v1/think`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer nope' },
    body: '{}'
  });
  assert.equal(wrong.status, 401);

  const right = await fetch(`${url}/v1/think`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer demo-secret' },
    body: '{}'
  });
  assert.equal(right.status, 200);

  const health = await fetch(`${url}/v1/health`);
  assert.equal(health.status, 200);
});

test('unknown route → 404', async () => {
  const res = await fetch(`${base}/v1/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'not_found');
  const deep = await fetch(`${base}/whatever/else`, { method: 'POST' });
  assert.equal(deep.status, 404);
});

test('wrong method on a known route → 405', async () => {
  const res = await fetch(`${base}/v1/think`);
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'POST, OPTIONS');
});

test('CORS restricted: foreign origin gets no allow-origin, listed origin is echoed', async () => {
  const url = strictServer.url;
  const foreign = await fetch(`${url}/v1/health`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(foreign.headers.get('access-control-allow-origin'), null);
  const listed = await fetch(`${url}/v1/health`, { headers: { Origin: 'https://allowed.example' } });
  assert.equal(listed.headers.get('access-control-allow-origin'), 'https://allowed.example');
  assert.equal(listed.headers.get('vary'), 'Origin');
});

test('rate limit: third request in the window from one forwarded IP → 429', async () => {
  const headers = { 'X-Forwarded-For': '203.0.113.9, 10.0.0.1' };
  const first = await fetch(`${strictServer.url}/v1/health`, { headers });
  const second = await fetch(`${strictServer.url}/v1/health`, { headers });
  const third = await fetch(`${strictServer.url}/v1/health`, { headers });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(third.status, 429);
  assert.ok(Number(third.headers.get('retry-after')) >= 1);
  const other = await fetch(`${strictServer.url}/v1/health`, { headers: { 'X-Forwarded-For': '198.51.100.7' } });
  assert.equal(other.status, 200);
});

test('startHttp rejects a missing factory or brain', () => {
  assert.throws(() => startHttp({ brain: fakeBrain }), /brainServerFactory/);
  assert.throws(() => startHttp({ brainServerFactory: () => createBrainServer(fakeBrain) }), /brain is required/);
});

// The transport answers JSON when it can; fall back to SSE framing just in case.
async function readJsonRpc(res) {
  const type = res.headers.get('content-type') ?? '';
  const text = await res.text();
  if (type.includes('text/event-stream')) {
    const line = text.split('\n').find((row) => row.startsWith('data:'));
    return JSON.parse(line.slice(5).trim());
  }
  return JSON.parse(text);
}
