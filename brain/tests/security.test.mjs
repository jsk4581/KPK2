// security.test.mjs — regression tests for the exposure rules of mcp/http.js (rate-limit key,
// Origin echo, batch cap, body limit, prototype pollution, garbage frames) and for the input
// boundary of mcp/server.js (which keys reach the brain, what the answer never echoes).
//
// Servers start in-process on port 0: a fake brain that echoes its validated input for the
// transport rules, the real brain (index.js) for the boundary proofs. Every value is synthetic.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import { createBrainServer, SERVER_NAME, SERVER_TITLE } from '../mcp/server.js';
import { startHttp, clientIp, normalizeOrigin, parseJson, MAX_BATCH, BODY_LIMIT_BYTES } from '../mcp/http.js';
import { CRISIS_PHRASES } from '../monitor.js';
import * as brain from '../index.js';

const silent = () => {};
const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };

// Fake brain: every function echoes its (validated) input so a test can see what crossed the boundary.
const echo = (input) => ({ echo: input });
const echoBrain = {
  think: echo,
  rankRoles: echo,
  planWeek: echo,
  checkIn: echo,
  analyzeState: echo,
  explain: echo,
  scenario: { _label: 'synthetic', _note: 'Sample persona — synthetic. Fake scenario for the security test.' }
};

const scenario = brain.loadScenario();
const realBrain = {
  think: brain.think,
  rankRoles: brain.rankRoles,
  planWeek: brain.planWeek,
  checkIn: brain.checkIn,
  analyzeState: brain.analyzeState,
  explain: brain.explain,
  scenario
};
// What a client sends for one think pass (the scenario's own keys, no in-process extras).
const thinkInput = {
  fields: scenario.fields,
  lifelog: scenario.lifelog,
  path: scenario.path,
  week: scenario.week,
  checkins: scenario.checkins,
  today: scenario.today
};

function serve(target, extra = {}) {
  return startHttp({
    brainServerFactory: () => createBrainServer(target),
    brain: target,
    port: 0,
    log: silent,
    rateLimit: { limit: 1000, windowMs: 60_000 },
    ...extra
  });
}

function post(url, body, headers = {}) {
  return fetch(url, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
}

async function mcpCall(base, name, args) {
  const client = new Client({ name: 'security-test', version: '0.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
  try {
    return { result: await client.callTool({ name, arguments: args }), serverInfo: client.getServerVersion() };
  } finally {
    await client.close();
  }
}

function fakeReq(headers, remoteAddress) {
  return { headers, socket: { remoteAddress } };
}

let open; // echo brain, CORS *, generous limit
let strictCors; // echo brain, one allowed origin
let limited; // echo brain, 3 requests per window
let real; // the real brain

before(async () => {
  [open, strictCors, limited, real] = await Promise.all([
    serve(echoBrain),
    serve(echoBrain, { corsOrigins: ['https://allowed.example'] }),
    serve(echoBrain, { rateLimit: { limit: 3, windowMs: 60_000 } }),
    serve(realBrain)
  ]);
});

after(async () => {
  await Promise.all([open, strictCors, limited, real].map((srv) => srv.close()));
});

// ---------------------------------------------------------------------------
describe('rate-limit key', () => {
  test('CF-Connecting-IP is the key; X-Forwarded-For can neither split nor dodge it', async () => {
    const statuses = [];
    for (let i = 1; i <= 4; i += 1) {
      // Same Cloudflare IP, a different (client-controlled) X-Forwarded-For every time.
      const res = await fetch(`${limited.url}/v1/health`, {
        headers: { 'CF-Connecting-IP': '203.0.113.50', 'X-Forwarded-For': `198.51.100.${i}, 10.0.0.${i}` }
      });
      statuses.push(res.status);
      if (res.status === 429) {
        assert.ok(Number(res.headers.get('retry-after')) >= 1);
        assert.equal((await res.json()).error.code, 'rate_limited');
      }
    }
    assert.deepEqual(statuses, [200, 200, 200, 429]);
    // A different Cloudflare IP is a different key even with the same X-Forwarded-For.
    const other = await fetch(`${limited.url}/v1/health`, {
      headers: { 'CF-Connecting-IP': '203.0.113.51', 'X-Forwarded-For': '198.51.100.1, 10.0.0.1' }
    });
    assert.equal(other.status, 200);
  });

  test('X-Forwarded-For: only the last hop counts; spoofing the first hop does not reset the counter', async () => {
    const statuses = [];
    for (let i = 1; i <= 4; i += 1) {
      const res = await fetch(`${limited.url}/v1/health`, { headers: { 'X-Forwarded-For': `203.0.113.${i}, 10.0.0.9` } });
      statuses.push(res.status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 429]);
    const otherHop = await fetch(`${limited.url}/v1/health`, { headers: { 'X-Forwarded-For': '203.0.113.1, 10.0.0.10' } });
    assert.equal(otherHop.status, 200);
  });

  test('clientIp: a non-loopback peer never takes its key from X-Forwarded-For', () => {
    const xff = { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' };
    assert.equal(clientIp(fakeReq(xff, '198.51.100.9')), '198.51.100.9', 'direct (non-loopback) peer: socket address');
    assert.equal(clientIp(fakeReq(xff, '127.0.0.1')), '10.0.0.1', 'loopback peer: last hop appended by the local proxy');
    assert.equal(clientIp(fakeReq(xff, '::ffff:127.0.0.1')), '10.0.0.1');
    assert.equal(clientIp(fakeReq(xff, '::1')), '10.0.0.1');
    assert.equal(clientIp(fakeReq({ 'cf-connecting-ip': '203.0.113.7', ...xff }, '198.51.100.9')), '203.0.113.7', 'CF wins');
    assert.equal(clientIp(fakeReq({ 'cf-connecting-ip': 'not an ip', ...xff }, '198.51.100.9')), '198.51.100.9', 'malformed CF ignored');
    assert.equal(clientIp(fakeReq({ 'x-forwarded-for': 'garbage;value' }, '127.0.0.1')), '127.0.0.1', 'malformed last hop ignored');
    assert.equal(clientIp(fakeReq({}, undefined)), 'unknown');
    assert.ok(clientIp(fakeReq({ 'cf-connecting-ip': 'a'.repeat(200) }, '127.0.0.1')).length <= 64, 'key is bounded');
  });
});

// ---------------------------------------------------------------------------
describe('Origin validation', () => {
  const MALFORMED = [
    'https://evil.example/path',
    'https://evil.example?x=1',
    'https://user@evil.example',
    'https://a b.example',
    'foo',
    `https://${'a'.repeat(300)}.example`
  ];

  test('a malformed Origin is never echoed: allow-all answers *, restricted answers nothing', async () => {
    for (const origin of MALFORMED) {
      const lax = await fetch(`${open.url}/v1/health`, { headers: { Origin: origin } });
      assert.equal(lax.status, 200);
      assert.equal(lax.headers.get('access-control-allow-origin'), '*', origin);
      const strict = await fetch(`${strictCors.url}/v1/health`, { headers: { Origin: origin } });
      assert.equal(strict.headers.get('access-control-allow-origin'), null, origin);
      assert.equal(strict.headers.get('vary'), 'Origin', origin);
    }
  });

  test('normalizeOrigin: header injection, userinfo and non-strings are rejected; null and well-formed pass', () => {
    assert.equal(normalizeOrigin('https://ok.example\r\nX-Injected: 1'), null);
    assert.equal(normalizeOrigin('https://ok.example '), null);
    assert.equal(normalizeOrigin('https://user:pw@ok.example'), null);
    assert.equal(normalizeOrigin(['https://ok.example']), null);
    assert.equal(normalizeOrigin(undefined), null);
    assert.equal(normalizeOrigin('https://ok.example'), 'https://ok.example');
    assert.equal(normalizeOrigin('http://localhost:5173'), 'http://localhost:5173');
    assert.equal(normalizeOrigin('null'), 'null');
    for (const origin of MALFORMED) assert.equal(normalizeOrigin(origin), null, origin);
  });

  test('restricted mode: the listed origin is echoed with Vary: Origin, a foreign one gets nothing', async () => {
    const allowed = await fetch(`${strictCors.url}/v1/health`, { headers: { Origin: 'https://allowed.example' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://allowed.example');
    assert.equal(allowed.headers.get('vary'), 'Origin');

    const foreign = await fetch(`${strictCors.url}/v1/health`, { headers: { Origin: 'https://other.example' } });
    assert.equal(foreign.headers.get('access-control-allow-origin'), null);
    assert.equal(foreign.headers.get('vary'), 'Origin');

    const preflight = await fetch(`${strictCors.url}/v1/think`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://allowed.example', 'Access-Control-Request-Method': 'POST' }
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://allowed.example');
    assert.equal(preflight.headers.get('vary'), 'Origin');

    // Allow-all echoes a well-formed origin, and then also varies on it.
    const lax = await fetch(`${open.url}/v1/health`, { headers: { Origin: 'https://demo.example' } });
    assert.equal(lax.headers.get('access-control-allow-origin'), 'https://demo.example');
    assert.equal(lax.headers.get('vary'), 'Origin');
  });
});

// ---------------------------------------------------------------------------
describe('MCP frames', () => {
  const ping = (id) => ({ jsonrpc: '2.0', id, method: 'ping' });

  test(`a batch above MAX_BATCH (${MAX_BATCH}) → 400 -32600; a batch at the cap is served`, async () => {
    const over = await post(`${open.url}/mcp`, Array.from({ length: MAX_BATCH + 1 }, (_, i) => ping(i)));
    assert.equal(over.status, 400);
    const body = await over.json();
    assert.equal(body.jsonrpc, '2.0');
    assert.equal(body.id, null);
    assert.equal(body.error.code, -32600);
    assert.match(body.error.message, new RegExp(`${MAX_BATCH}`));

    const atCap = await post(`${open.url}/mcp`, Array.from({ length: MAX_BATCH }, (_, i) => ping(i)));
    assert.equal(atCap.status, 200);
    const answers = await atCap.json();
    assert.equal(answers.length, MAX_BATCH);
  });

  test('garbage frames → 4xx JSON-RPC errors without a stack, and the server keeps answering', async () => {
    const frames = [
      'nope',
      '42',
      '"str"',
      'null',
      '{}',
      '{"jsonrpc":"2.0"}',
      '{"jsonrpc":"2.0","id":1}',
      '{"jsonrpc":"2.0","method":5,"id":1}',
      '[1,2,3]',
      '\u0000\u0001\u0002',
      `{"a":${'['.repeat(64)}`
    ];
    for (const frame of frames) {
      const res = await post(`${open.url}/mcp`, frame);
      assert.equal(res.status, 400, JSON.stringify(frame));
      const text = await res.text();
      const body = JSON.parse(text);
      assert.equal(body.jsonrpc, '2.0');
      assert.equal(body.id, null);
      assert.ok([-32700, -32600].includes(body.error.code), JSON.stringify(frame));
      assert.doesNotMatch(text, /at .*\.js:\d+/);
    }
    // Wrong negotiation headers are a 4xx too, never a crash.
    const noAccept = await fetch(`${open.url}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ping(1))
    });
    assert.ok(noAccept.status >= 400 && noAccept.status < 500, `status ${noAccept.status}`);

    const health = await fetch(`${open.url}/v1/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).name, SERVER_NAME);
    const alive = await post(`${open.url}/mcp`, ping(9));
    assert.equal(alive.status, 200);
    assert.equal((await alive.json()).id, 9);
  });

  test('initialize reports the product name and title', async () => {
    const { serverInfo } = await mcpCall(open.url, 'get_scenario', {});
    assert.equal(serverInfo.name, 'dream-achieve-moments-brain');
    assert.equal(serverInfo.name, SERVER_NAME);
    assert.equal(serverInfo.title, 'Dream Achieve Moments Brain');
    assert.equal(serverInfo.title, SERVER_TITLE);
    assert.match(serverInfo.version, /^\d+\.\d+\.\d+/);
  });
});

// ---------------------------------------------------------------------------
describe('body limit', () => {
  const oversized = () => JSON.stringify({ fields: { career: 'x'.repeat(BODY_LIMIT_BYTES + 1024) } });

  test(`> ${BODY_LIMIT_BYTES} bytes → 413 with Connection: close on /v1/* and /mcp`, async () => {
    for (const path of ['/v1/think', '/v1/check-in', '/mcp']) {
      const res = await post(`${open.url}${path}`, oversized());
      assert.equal(res.status, 413, path);
      assert.equal(res.headers.get('connection'), 'close', path);
      const body = await res.json();
      assert.equal(body.error.code, 'payload_too_large');
      assert.doesNotMatch(JSON.stringify(body), /at .*\.js:\d+/);
    }
    const health = await fetch(`${open.url}/v1/health`);
    assert.equal(health.status, 200);
  });

  test('a body of exactly the limit is still accepted', async () => {
    const prefix = '{"fields":{"career":"';
    const suffix = '"}}';
    const body = prefix + 'y'.repeat(BODY_LIMIT_BYTES - prefix.length - suffix.length) + suffix;
    assert.equal(Buffer.byteLength(body), BODY_LIMIT_BYTES);
    const res = await post(`${open.url}/v1/think`, body);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).echo.fields.career.length, BODY_LIMIT_BYTES - prefix.length - suffix.length);
  });
});

// ---------------------------------------------------------------------------
describe('prototype pollution', () => {
  const POISON = '{"__proto__":{"zzPolluted":1},"constructor":{"prototype":{"zzPolluted2":2}},"prototype":{"zzPolluted3":3}}';

  test('parseJson drops __proto__ / constructor / prototype at every depth', () => {
    const parsed = parseJson(`{"nested":${POISON},"list":[${POISON}],"ok":true,${POISON.slice(1)}`);
    assert.equal(parsed.ok, true);
    const value = parsed.value;
    assert.equal(Object.getPrototypeOf(value), Object.prototype);
    assert.deepEqual(value, { nested: {}, list: [{}], ok: true });
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      assert.ok(!Object.hasOwn(value, key), key);
      assert.ok(!Object.hasOwn(value.nested, key), key);
    }
    assert.equal({}.zzPolluted, undefined);
    assert.equal(Object.prototype.zzPolluted, undefined);
  });

  test('a __proto__ key in a REST body never reaches the brain nor Object.prototype', async () => {
    // `week` is a loose object (unknown keys pass through), so the reviver is the only guard here.
    const body = `{"week":{"__proto__":{"zzPolluted":1},"actions":[]},"actionId":"a1","kind":"done","today":"Thu",${POISON.slice(1)}`;
    const res = await post(`${open.url}/v1/check-in`, body);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.doesNotMatch(text, /__proto__|zzPolluted/);
    const out = JSON.parse(text);
    assert.deepEqual(out.echo.week, { actions: [] });
    assert.ok(!Object.hasOwn(out.echo, '__proto__'));
    assert.equal({}.zzPolluted, undefined);
    assert.equal({}.zzPolluted2, undefined);
    assert.equal({}.zzPolluted3, undefined);
    assert.equal(Object.prototype.zzPolluted, undefined);
  });

  test('the same key through MCP tools/call is stripped as well', async () => {
    const frame =
      '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"check_in","arguments":' +
      '{"week":{"__proto__":{"zzPolluted":1},"actions":[]},"actionId":"a1","kind":"done","today":"Thu"}}}';
    const res = await post(`${open.url}/mcp`, frame);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.doesNotMatch(text, /__proto__|zzPolluted/);
    const out = JSON.parse(text);
    assert.deepEqual(out.result.structuredContent.echo.week, { actions: [] });
    assert.equal({}.zzPolluted, undefined);
  });
});

// ---------------------------------------------------------------------------
describe('input boundary: brain-only keys reach the brain, unknown keys do not', () => {
  const extras = {
    confirmedGates: ['M1'],
    confirmed: false,
    arcStart: '2026-10-05',
    arc_start: '2026-10-05',
    skills: [{ id: 'copy-editing', keywords: ['edit'] }],
    roles: [{ id: 'editor', title: 'Editor', requires: ['copy-editing'] }],
    freeText: 'a note',
    condition: 3,
    enabledSources: ['note'],
    gates: [{ id: 'M1', passed: false }]
  };

  test('REST: think / explain / analyze_state / check_in keep the declared keys and drop junk', async () => {
    const think = await (await post(`${open.url}/v1/think`, { ...extras, today: 'Thu', junk: 1 })).json();
    for (const key of Object.keys(extras)) assert.deepEqual(think.echo[key], extras[key], key);
    assert.ok(!('junk' in think.echo));

    const explain = await (await post(`${open.url}/v1/explain`, { ...extras, decision: { kind: 'full' }, junk: 1 })).json();
    assert.deepEqual(explain.echo.confirmedGates, ['M1']);
    assert.equal(explain.echo.freeText, 'a note');
    assert.ok(!('junk' in explain.echo));

    const analyze = await (await post(`${open.url}/v1/analyze-state`, { enabledSources: ['note'], arcStart: '2026-10-05', arc_start: '2026-10-05', today: '2026-10-15', condition: 2, junk: 1 })).json();
    assert.deepEqual(analyze.echo.enabledSources, ['note']);
    assert.equal(analyze.echo.arcStart, '2026-10-05');
    assert.equal(analyze.echo.arc_start, '2026-10-05');
    assert.equal(analyze.echo.condition, 2);
    assert.ok(!('junk' in analyze.echo));

    const checkIn = await (
      await post(`${open.url}/v1/check-in`, {
        ...extras,
        week: { actions: [] },
        actionId: 'a1',
        kind: 'not_today',
        today: 'Thu',
        reason: 'energy',
        fields: { career: 'a', now: 'b', pull: 'c' },
        path: { role_id: 'editor' },
        junk: 1
      })
    ).json();
    assert.equal(checkIn.echo.reason, 'energy');
    assert.equal(checkIn.echo.kind, 'not_today');
    assert.deepEqual(checkIn.echo.fields, { career: 'a', now: 'b', pull: 'c' });
    assert.deepEqual(checkIn.echo.path, { role_id: 'editor' });
    for (const key of Object.keys(extras)) assert.deepEqual(checkIn.echo[key], extras[key], key);
    assert.ok(!('junk' in checkIn.echo));
  });

  test('MCP tools/call: the same keys reach think and check_in', async () => {
    const think = await mcpCall(open.url, 'think', { ...extras, today: 'Thu', junk: 1 });
    assert.notEqual(think.result.isError, true);
    for (const key of Object.keys(extras)) assert.deepEqual(think.result.structuredContent.echo[key], extras[key], key);
    assert.ok(!('junk' in think.result.structuredContent.echo));

    const checkIn = await mcpCall(open.url, 'check_in', { week: { actions: [] }, actionId: 'a1', kind: 'not_today', today: 'Thu', reason: 'time', freeText: ['x'] });
    assert.equal(checkIn.result.structuredContent.echo.reason, 'time');
    assert.deepEqual(checkIn.result.structuredContent.echo.freeText, ['x']);
  });

  test('a declared key of the wrong type is a 400, not a silent drop', async () => {
    const res = await post(`${open.url}/v1/think`, { confirmedGates: 'M1' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'invalid_input');
    assert.match(body.error.message, /confirmedGates/);
  });
});

// ---------------------------------------------------------------------------
describe('input boundary: proofs on the real brain', () => {
  test('confirmedGates makes goal validated reachable over REST and MCP', async () => {
    const plain = await (await post(`${real.url}/v1/think`, thinkInput)).json();
    assert.equal(plain.goal.state, 'provisional');

    const confirmed = await (await post(`${real.url}/v1/think`, { ...thinkInput, confirmedGates: ['M1'] })).json();
    assert.equal(confirmed.goal.state, 'validated');
    assert.equal(confirmed.goal.milestones[0].passed, true);
    assert.equal(confirmed.intervention.kind, 'gate');
    assert.equal(confirmed.intervention.message.lint.ok, true);

    const viaMcp = await mcpCall(real.url, 'think', { ...thinkInput, confirmedGates: ['M1'] });
    assert.notEqual(viaMcp.result.isError, true);
    assert.equal(viaMcp.result.structuredContent.goal.state, 'validated');
    assert.deepEqual(viaMcp.result.structuredContent, confirmed);
  });

  test('arcStart (and the arc_start alias) moves the gate dates', async () => {
    const moved = await (await post(`${real.url}/v1/think`, { ...thinkInput, arcStart: '2026-10-01' })).json();
    assert.equal(moved.goal.arcStart, '2026-10-01');
    assert.equal(moved.goal.milestones[0].date, '2026-10-15');
    const alias = await (await post(`${real.url}/v1/think`, { ...thinkInput, arc_start: '2026-10-01' })).json();
    assert.equal(alias.goal.arcStart, '2026-10-01');
    const analyzed = await (await post(`${real.url}/v1/analyze-state`, { lifelog: scenario.lifelog, checkins: scenario.checkins, today: scenario.today, arcStart: '2026-10-01' })).json();
    assert.equal(analyzed.arcStart, '2026-10-01');
  });

  test('freeText with a crisis phrase escalates; the phrase is never echoed back', async () => {
    // CRISIS_PHRASES[0] does not occur in the 988 escalation message itself, so its absence is a
    // real check; the marker is unique user text that must not appear anywhere in the answer.
    const phrase = CRISIS_PHRASES[0];
    const marker = 'zq-marker-7731';
    const freeText = `${phrase} ${marker}`;

    const viaMcp = await mcpCall(real.url, 'think', { ...thinkInput, freeText });
    assert.notEqual(viaMcp.result.isError, true);
    const report = viaMcp.result.structuredContent;
    assert.equal(report.monitor.review.escalate.reason, 'crisis_language');
    assert.match(report.monitor.review.escalate.message, /988/);
    assert.deepEqual(report.monitor.review.nextWeekSeed.actions, []);
    for (const text of [viaMcp.result.content[0].text, JSON.stringify(report)]) {
      assert.ok(!text.toLowerCase().includes(phrase), 'phrase echoed');
      assert.ok(!text.includes(marker), 'free text echoed');
      assert.ok(!text.includes('freeText'), 'free text key echoed');
    }

    const viaRest = await post(`${real.url}/v1/think`, { ...thinkInput, freeText: [freeText] });
    assert.equal(viaRest.status, 200);
    const restText = await viaRest.text();
    assert.equal(JSON.parse(restText).monitor.review.escalate.reason, 'crisis_language');
    assert.ok(!restText.toLowerCase().includes(phrase));
    assert.ok(!restText.includes(marker));

    // check_in re-runs think on the new week with the same free text.
    const checkIn = await post(`${real.url}/v1/check-in`, {
      ...thinkInput,
      checkins: scenario.checkins.slice(0, -1),
      actionId: 'a3',
      kind: 'done',
      freeText
    });
    assert.equal(checkIn.status, 200);
    const checkInText = await checkIn.text();
    const applied = JSON.parse(checkInText);
    assert.equal(applied.ok, true);
    assert.equal(applied.brain.monitor.review.escalate.reason, 'crisis_language');
    assert.ok(!checkInText.toLowerCase().includes(phrase));
    assert.ok(!checkInText.includes(marker));

    // Without free text nothing escalates (same inputs otherwise).
    const calm = await (await post(`${real.url}/v1/think`, thinkInput)).json();
    assert.equal(calm.monitor.review.escalate, null);
  });

  test('check_in: the Not-today reason chip lands on the new record and in the constraint', async () => {
    const res = await post(`${real.url}/v1/check-in`, {
      fields: scenario.fields,
      path: scenario.path,
      week: scenario.week,
      checkins: scenario.checkins.slice(0, 3),
      lifelog: scenario.lifelog.filter((item) => item.date <= '2026-10-13'),
      actionId: 'a1',
      kind: 'not_today',
      today: '2026-10-13',
      reason: 'energy'
    });
    assert.equal(res.status, 200);
    const out = await res.json();
    assert.equal(out.ok, true);
    assert.deepEqual(out.checkins.at(-1), { actionId: 'a1', kind: 'not_today', day: 'Tue', date: '2026-10-13', blocker_reason: 'energy' });
    assert.equal(out.brain.constraint.constraint, 'motivation-automatic');
  });

  test('enabledSources over REST: disabled sources never reach the brain', async () => {
    const res = await (await post(`${real.url}/v1/think`, { ...thinkInput, enabledSources: ['sms', 'messenger'] })).json();
    assert.deepEqual(res.context.enabledSources, ['sms', 'messenger']);
    assert.equal(res.context.lifelogCount, scenario.lifelog.filter((item) => ['sms', 'messenger'].includes(item.source)).length);
  });

  test('replaying day 11 from the full history over REST is the scenario amber', async () => {
    const { date, riskLevel, reasons } = scenario.expected.day11;
    const analyzed = await (await post(`${real.url}/v1/analyze-state`, { lifelog: scenario.lifelog, checkins: scenario.checkins, today: date })).json();
    assert.equal(analyzed.risk.level, riskLevel);
    assert.deepEqual(analyzed.risk.reasons, reasons);
    const thought = await (await post(`${real.url}/v1/think`, { ...thinkInput, today: date })).json();
    assert.equal(thought.state.risk.level, riskLevel);
    assert.ok(['shrink', 'rest'].includes(thought.intervention.kind), thought.intervention.kind);
  });
});
