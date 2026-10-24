// agent-routes.test.mjs — /v1/agent/chat, /v1/usage and the agent-backed /v1/interview behind the
// real http.js on port 0, with a FAKE agent (no SDK, no network, no key). The brain is a fake too,
// except brain.scenario which is a tiny synthetic scenario used for the request defaults.
// Run: cd brain && node --test tests/agent-routes.test.mjs
import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { createBrainServer } from '../mcp/server.js';
import { startHttp } from '../mcp/http.js';
import { handleCompat, mapLifelog } from '../mcp/compat.js';
import {
  AGENT_ROUTES,
  DEFAULT_MODEL,
  agentEnabled,
  chatInput,
  handleAgent,
  isAgentRoute,
  partnerKeyOf,
} from '../mcp/agent-routes.js';

const scenario = {
  _label: 'synthetic',
  _note: 'Sample persona — synthetic. Fake scenario for the agent route test.',
  id: 'fake-scenario',
  today: '2026-10-18',
  persona: { name: 'Sample persona — synthetic', role: 'copywriter' },
  lifelog: [{ id: 'l01', ts: '2026-10-05T09:00:00Z', source: 'note', title: 'Note', summary: 'A synthetic note.' }],
};

const fakeBrain = {
  think: () => ({}),
  rankRoles: () => ({ skillIds: [], roles: [] }),
  planWeek: () => ({}),
  checkIn: () => ({}),
  analyzeState: () => ({}),
  explain: () => ({}),
  scenario,
};

const USAGE = {
  model: DEFAULT_MODEL,
  input_tokens: 1200,
  output_tokens: 80,
  cache_read_input_tokens: 900,
  cache_creation_input_tokens: 0,
  cost_usd: 0.00658,
};

// Fake agent implementing the interface bin.js wires in: enabled, chat(), ledger.
function makeFakeAgent() {
  const calls = [];
  const ledger = { partners: {}, total: { turns: 0, cost_usd: 0 } };
  const agent = {
    enabled: true,
    model: DEFAULT_MODEL,
    mode: 'ok', // 'ok' | 'throw' | 'empty' | 'banned'
    calls,
    chat: async (input) => {
      calls.push(input);
      if (agent.mode === 'throw') throw new Error('fake upstream failure fake-secret-should-not-leak');
      if (agent.mode === 'empty') return { reply: { text: '' }, ready_for_paths: false, tool_calls: [], usage: USAGE, trace: [] };
      if (agent.mode === 'banned') {
        agent.ledger.record(input.partnerKey, USAGE);
        return { reply: { text: 'You should have done it because you had time. What changed?' }, ready_for_paths: false, tool_calls: [], usage: USAGE, trace: [] };
      }
      agent.ledger.record(input.partnerKey, USAGE);
      return {
        reply: { text: `Agent reply for ${input.partnerKey}: what changed this year?` },
        ready_for_paths: input.history.filter((h) => h.role === 'user').length >= 2,
        tool_calls: [{ name: 'rank_roles', ms: 3.2, ok: true }],
        usage: USAGE,
        trace: [{ layer: 'L3', stage: 'interview', label: 'Agent tool: rank_roles', status: 'ran', input_summary: 'fields', output_summary: '3 roles', ms: 3.2 }],
      };
    },
    ledger: {
      record(key, usage) {
        const p = (ledger.partners[key] ||= { turns: 0, cost_usd: 0 });
        p.turns += 1;
        p.cost_usd += usage.cost_usd;
        ledger.total.turns += 1;
        ledger.total.cost_usd += usage.cost_usd;
      },
      summary: () => ({ partners: ledger.partners, total: ledger.total }),
    },
  };
  return agent;
}

const silent = () => {};
const logLines = [];
let fakeAgent;
let withAgent;
let noAgent;
let tokenServer;

function serve(extra) {
  return startHttp({
    brainServerFactory: () => createBrainServer(fakeBrain),
    brain: fakeBrain,
    port: 0,
    log: (line) => logLines.push(line),
    rateLimit: { limit: 1000, windowMs: 60_000 },
    ...extra,
  });
}

function call(base, path, { method = 'POST', body, headers = {} } = {}) {
  return fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  }).then(async (res) => ({ status: res.status, body: await res.json(), headers: res.headers }));
}

const interviewBody = { scenario_id: 'fake-scenario', persona: scenario.persona, lifelog: scenario.lifelog, history: [], user_turn: null };

before(async () => {
  fakeAgent = makeFakeAgent();
  withAgent = await serve({ ctx: { agent: fakeAgent } });
  noAgent = await serve({ log: silent });
  tokenServer = await serve({ ctx: { agent: fakeAgent }, token: 'demo-secret', log: silent });
});

after(async () => {
  await Promise.all([withAgent.close(), noAgent.close(), tokenServer.close()]);
});

beforeEach(() => {
  fakeAgent.mode = 'ok';
  fakeAgent.calls.length = 0;
  delete process.env.BRAIN_AGENT;
});

describe('helpers', () => {
  test('isAgentRoute covers /v1/agent/* and /v1/usage only', () => {
    assert.deepEqual(AGENT_ROUTES, ['/v1/agent/chat', '/v1/usage']);
    assert.equal(isAgentRoute('/v1/agent/chat'), true);
    assert.equal(isAgentRoute('/v1/agent/anything'), true);
    assert.equal(isAgentRoute('/v1/usage'), true);
    assert.equal(isAgentRoute('/v1/interview'), false);
    assert.equal(isAgentRoute('/v1/usages'), false);
  });

  test('partnerKeyOf: header → key, missing or malformed → demo', () => {
    assert.equal(partnerKeyOf({}), 'demo');
    assert.equal(partnerKeyOf({ 'x-partner-key': 'acme-co.v2' }), 'acme-co.v2');
    assert.equal(partnerKeyOf({ 'x-partner-key': '  padded  ' }), 'padded');
    assert.equal(partnerKeyOf({ 'x-partner-key': 'has space' }), 'demo');
    assert.equal(partnerKeyOf({ 'x-partner-key': 'x'.repeat(65) }), 'demo');
    assert.equal(partnerKeyOf({ 'x-partner-key': '' }), 'demo');
    assert.equal(partnerKeyOf(undefined), 'demo');
  });

  test('agentEnabled needs enabled:true + chat() and honours BRAIN_AGENT=off', () => {
    assert.equal(agentEnabled({}), false);
    assert.equal(agentEnabled({ agent: { enabled: false, chat: async () => ({}) } }), false);
    assert.equal(agentEnabled({ agent: { enabled: true } }), false);
    assert.equal(agentEnabled({ agent: fakeAgent }), true);
    process.env.BRAIN_AGENT = 'off';
    assert.equal(agentEnabled({ agent: fakeAgent }), false);
    delete process.env.BRAIN_AGENT;
  });

  test('chatInput maps Build keys to the agent input and defaults from the scenario', () => {
    const mapped = chatInput({ user_turn: { source: 'voice', text: 'hi' } }, { partnerKey: 'p1', scenario });
    assert.deepEqual(mapped, {
      partnerKey: 'p1',
      scenarioId: 'fake-scenario',
      persona: scenario.persona,
      lifelog: scenario.lifelog,
      history: [],
      userTurn: { source: 'voice', text: 'hi' },
      today: '2026-10-18',
    });
    const explicit = chatInput(
      { scenario_id: 's2', persona: null, lifelog: [], history: [{ role: 'user', text: 'a' }], user_turn: 'plain string', today: '2026-10-20' },
      { partnerKey: '', scenario },
    );
    assert.equal(explicit.partnerKey, 'demo');
    assert.equal(explicit.scenarioId, 's2');
    assert.equal(explicit.persona, null);
    assert.deepEqual(explicit.lifelog, []);
    assert.deepEqual(explicit.userTurn, { source: 'script', text: 'plain string' });
    assert.equal(explicit.today, '2026-10-20');
    assert.equal(chatInput({ user_turn: null }, { scenario }).userTurn, null);
  });
});

describe('POST /v1/agent/chat', () => {
  test('200 with the agent result (reply, usage, tool_calls); partnerKey defaults to demo', async () => {
    const res = await call(withAgent.url, '/v1/agent/chat', { body: { user_turn: { source: 'script', text: 'Clients send AI drafts now.' } } });
    assert.equal(res.status, 200);
    assert.match(res.body.reply.text, /^Agent reply for demo/);
    assert.equal(res.body.ready_for_paths, false);
    assert.deepEqual(res.body.usage, USAGE);
    assert.equal(typeof res.body.usage.input_tokens, 'number');
    assert.equal(typeof res.body.usage.cost_usd, 'number');
    assert.deepEqual(res.body.tool_calls, [{ name: 'rank_roles', ms: 3.2, ok: true }]);
    assert.equal(fakeAgent.calls.length, 1);
    const input = fakeAgent.calls[0];
    assert.equal(input.partnerKey, 'demo');
    assert.equal(input.scenarioId, 'fake-scenario');
    assert.deepEqual(input.persona, scenario.persona);
    assert.deepEqual(input.lifelog, scenario.lifelog);
    assert.deepEqual(input.history, []);
    assert.deepEqual(input.userTurn, { source: 'script', text: 'Clients send AI drafts now.' });
    assert.equal(input.today, '2026-10-18');
  });

  test('X-Partner-Key becomes partnerKey; request fields override scenario defaults', async () => {
    const body = {
      scenario_id: 'other',
      persona: { name: 'Another synthetic persona' },
      lifelog: [],
      history: [{ role: 'user', text: 'one' }, { role: 'agent', text: 'ok' }, { role: 'user', text: 'two' }],
      user_turn: 'three',
      today: '2026-10-21',
    };
    const res = await call(withAgent.url, '/v1/agent/chat', { body, headers: { 'X-Partner-Key': 'acme' } });
    assert.equal(res.status, 200);
    assert.match(res.body.reply.text, /^Agent reply for acme/);
    assert.equal(res.body.ready_for_paths, true);
    const input = fakeAgent.calls[0];
    assert.equal(input.partnerKey, 'acme');
    assert.equal(input.scenarioId, 'other');
    assert.deepEqual(input.persona, body.persona);
    assert.deepEqual(input.lifelog, []);
    assert.equal(input.history.length, 3);
    assert.deepEqual(input.userTurn, { source: 'script', text: 'three' });
    assert.equal(input.today, '2026-10-21');
  });

  test('agent disabled → 503 agent_disabled', async () => {
    const res = await call(noAgent.url, '/v1/agent/chat', { body: { user_turn: 'hi' } });
    assert.equal(res.status, 503);
    assert.equal(res.body.error.code, 'agent_disabled');
    process.env.BRAIN_AGENT = 'off';
    const off = await call(withAgent.url, '/v1/agent/chat', { body: { user_turn: 'hi' } });
    assert.equal(off.status, 503);
    assert.equal(off.body.error.code, 'agent_disabled');
    assert.equal(fakeAgent.calls.length, 0);
  });

  test('agent throws → 502 agent_error with a generic message and no detail or stack', async () => {
    fakeAgent.mode = 'throw';
    const res = await call(withAgent.url, '/v1/agent/chat', { body: { user_turn: 'hi' } });
    assert.equal(res.status, 502);
    assert.deepEqual(Object.keys(res.body), ['error']);
    assert.equal(res.body.error.code, 'agent_error');
    const text = JSON.stringify(res.body);
    assert.doesNotMatch(text, /should-not-leak|upstream|stack|at /);
    assert.ok(logLines.some((line) => line.includes('AGENT_ERROR /v1/agent/chat')), 'detail reaches the server log');
  });

  test('400 for invalid JSON and for a body without user_turn', async () => {
    const bad = await call(withAgent.url, '/v1/agent/chat', { body: '{ nope' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, 'invalid_json');
    const missing = await call(withAgent.url, '/v1/agent/chat', { body: { history: [] } });
    assert.equal(missing.status, 400);
    assert.equal(missing.body.error.code, 'invalid_input');
    assert.match(missing.body.error.message, /user_turn/);
    const wrongRole = await call(withAgent.url, '/v1/agent/chat', { body: { user_turn: 'x', history: [{ role: 'system', text: 'no' }] } });
    assert.equal(wrongRole.status, 400);
    assert.equal(fakeAgent.calls.length, 0);
  });

  test('405 on GET, 404 for an unknown /v1/agent/* path', async () => {
    const get = await call(withAgent.url, '/v1/agent/chat', { method: 'GET' });
    assert.equal(get.status, 405);
    assert.equal(get.headers.get('allow'), 'POST, OPTIONS');
    const unknown = await call(withAgent.url, '/v1/agent/nope', { body: {} });
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.error.code, 'not_found');
  });

  test('token server: 401 without bearer, 200 with it; CORS header present', async () => {
    const denied = await call(tokenServer.url, '/v1/agent/chat', { body: { user_turn: 'hi' } });
    assert.equal(denied.status, 401);
    const ok = await call(tokenServer.url, '/v1/agent/chat', {
      body: { user_turn: 'hi' },
      headers: { Authorization: 'Bearer demo-secret', Origin: 'https://demo.example' },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('access-control-allow-origin'), 'https://demo.example');
    const usage = await fetch(`${tokenServer.url}/v1/usage`);
    assert.equal(usage.status, 401);
  });
});

describe('GET /v1/usage', () => {
  test('ledger summary + pricing', async () => {
    const res = await call(withAgent.url, '/v1/usage', { method: 'GET' });
    assert.equal(res.status, 200);
    assert.equal(res.body.enabled, true);
    assert.deepEqual(res.body.pricing.model, DEFAULT_MODEL);
    assert.equal(res.body.pricing.usd_per_mtok.input, 4);
    assert.equal(res.body.pricing.usd_per_mtok.output, 20);
    assert.equal(res.body.pricing.usd_per_mtok.cache_read, 0.2);
    assert.equal(typeof res.body.partners, 'object');
    assert.equal(typeof res.body.total, 'object');
    // Earlier tests in this file recorded turns for demo and acme through the fake ledger.
    assert.ok(res.body.total.turns >= 1);
    assert.ok(res.body.partners.demo && res.body.partners.demo.turns >= 1);
    assert.ok(res.body.partners.acme && res.body.partners.acme.turns >= 1);
  });

  test('without an agent: 200, enabled false, empty ledger, pricing still listed', async () => {
    const res = await call(noAgent.url, '/v1/usage', { method: 'GET' });
    assert.equal(res.status, 200);
    assert.equal(res.body.enabled, false);
    assert.deepEqual(res.body.partners, {});
    assert.deepEqual(res.body.total, {});
    assert.equal(res.body.pricing.usd_per_mtok.input, 4);
  });

  test('POST /v1/usage → 405', async () => {
    const res = await call(withAgent.url, '/v1/usage', { body: {} });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'GET, OPTIONS');
  });

  test('a ledger whose summary() throws still answers 200 with an empty ledger', async () => {
    const broken = { enabled: true, chat: async () => ({}), ledger: { record() {}, summary() { throw new Error('boom'); } } };
    const out = await handleAgent({ path: '/v1/usage', method: 'GET', agent: broken });
    assert.equal(out.status, 200);
    assert.deepEqual(out.body.partners, {});
    assert.deepEqual(out.body.total, {});
  });
});

describe('POST /v1/interview with the agent', () => {
  test('agent enabled → source agent, usage, agent trace first then the designed steps', async () => {
    const res = await call(withAgent.url, '/v1/interview', { body: interviewBody, headers: { 'X-Partner-Key': 'acme' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.source, 'agent');
    assert.match(res.body.reply.text, /^Agent reply for acme/);
    assert.equal(res.body.ready_for_paths, false);
    assert.deepEqual(res.body.usage, USAGE);
    assert.deepEqual(res.body.tool_calls, [{ name: 'rank_roles', ms: 3.2, ok: true }]);
    const { trace } = res.body;
    assert.equal(trace[0].layer, 'L3');
    assert.equal(trace[0].stage, 'interview');
    assert.equal(trace[0].status, 'ran');
    assert.equal(typeof trace[0].ms, 'number');
    assert.match(trace[0].input_summary, /1 tool call: rank_roles/);
    assert.match(trace[0].output_summary, /1200 in \/ 80 out/);
    assert.equal(trace[1].label, 'Agent tool: rank_roles');
    assert.deepEqual(trace.slice(2).map((s) => [s.stage, s.status, s.ms]), [['scrub', 'designed', null], ['graph', 'designed', null]]);
    const input = fakeAgent.calls[0];
    assert.equal(input.partnerKey, 'acme');
    assert.equal(input.scenarioId, 'fake-scenario');
    // The Build lifelog (ts, source) reaches the agent in the logic shape the brain tools take (date, tags, url).
    assert.deepEqual(input.lifelog, mapLifelog(scenario.lifelog));
    assert.equal(input.lifelog[0].date, '2026-10-05');
    assert.equal(input.userTurn, null);
  });

  test('agent throws → 200 scripted reply, source script, fallback trace step first, no usage', async () => {
    fakeAgent.mode = 'throw';
    const res = await call(withAgent.url, '/v1/interview', { body: interviewBody });
    assert.equal(res.status, 200);
    assert.equal(res.body.source, 'script');
    assert.match(res.body.reply.text, /What changed in your work/);
    assert.equal(res.body.ready_for_paths, false);
    assert.equal(res.body.usage, undefined);
    const first = res.body.trace[0];
    assert.equal(first.status, 'ran');
    assert.equal(typeof first.ms, 'number');
    assert.match(first.label, /Agent unavailable/);
    assert.ok(res.body.trace.some((s) => s.stage === 'ingest' && s.status === 'ran'));
    assert.ok(res.body.trace.some((s) => s.stage === 'graph' && s.status === 'designed'));
    assert.doesNotMatch(JSON.stringify(res.body), /should-not-leak/);
    assert.ok(logLines.some((line) => line.includes('AGENT_FALLBACK /v1/interview')));
  });

  test('agent returns an empty reply → treated as an error → scripted fallback', async () => {
    fakeAgent.mode = 'empty';
    const res = await call(withAgent.url, '/v1/interview', { body: interviewBody });
    assert.equal(res.status, 200);
    assert.equal(res.body.source, 'script');
    assert.match(res.body.reply.text, /What changed in your work/);
  });

  test('agent reply trips the lint (banned words) → scripted fallback with a lint trace step; usage stays in the ledger', async () => {
    fakeAgent.mode = 'banned';
    const res = await call(withAgent.url, '/v1/interview', { body: interviewBody, headers: { 'X-Partner-Key': 'lintco' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.source, 'script');
    assert.match(res.body.reply.text, /What changed in your work/);
    assert.doesNotMatch(res.body.reply.text, /should have|because you/);
    const first = res.body.trace[0];
    assert.equal(first.status, 'ran');
    assert.match(first.label, /tripped the lint/);
    assert.match(first.input_summary, /should/);
    assert.match(first.output_summary, /still counted/);
    assert.equal(fakeAgent.ledger.summary().partners.lintco.turns, 1);
    assert.ok(logLines.some((line) => line.includes('AGENT_FALLBACK /v1/interview') && line.includes('tripped the lint')));
  });

  test('BRAIN_AGENT=off or no agent → scripted reply without calling the agent', async () => {
    process.env.BRAIN_AGENT = 'off';
    const off = await call(withAgent.url, '/v1/interview', { body: interviewBody });
    assert.equal(off.status, 200);
    assert.equal(off.body.source, 'script');
    assert.equal(fakeAgent.calls.length, 0);
    delete process.env.BRAIN_AGENT;
    const plain = await call(noAgent.url, '/v1/interview', { body: interviewBody });
    assert.equal(plain.status, 200);
    assert.equal(plain.body.source, 'script');
    assert.ok(!plain.body.trace.some((s) => /Agent/.test(s.label)));
  });

  test('other compat routes ignore the agent (handleCompat stays scripted for /v1/paths)', async () => {
    const out = await handleCompat('/v1/paths', { ...interviewBody, history: [] }, fakeBrain, { agent: fakeAgent, partnerKey: 'demo' });
    assert.equal(out.status, 200);
    assert.equal(out.body.paths.length, 3);
    assert.equal(fakeAgent.calls.length, 0);
  });
});
