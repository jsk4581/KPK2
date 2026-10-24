// agent.test.mjs — the L3 coach agent with a FAKE brain and a scripted Anthropic client.
//
// The "fake client" is a real Anthropic SDK client whose fetch is replaced by a script of
// canned /v1/messages responses, so the real Tool Runner wiring (tool_use -> run -> tool_result)
// is exercised with zero network calls. No API key is read anywhere in this file; the live smoke
// test at the bottom runs only with RUN_LIVE=1 and reads the key through process.env at runtime.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';

import { createAgent, TOOL_NAMES, SYSTEM_PROMPT, REFUSAL_REPLY, READY_MARKER, MAX_TOKENS, BETAS } from '../agent/index.js';
import { costUsd, PRICES, DEFAULT_MODEL, round6 } from '../agent/pricing.js';
import { createLedger } from '../agent/ledger.js';
import { buildMessages, countUserTurns, stripMarker, buildContextBlock } from '../agent/prompt.js';

const MODEL = 'claude-opus-5-5';
const FAKE_KEY = 'test-key-not-real';

// ---------- fixtures ----------

function message(overrides = {}) {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: MODEL,
    content: [],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    ...overrides
  };
}

const toolUse = (name, input, id = 'tu_1', usage = {}) =>
  message({
    content: [{ type: 'tool_use', id, name, input }],
    stop_reason: 'tool_use',
    usage: { input_tokens: 100, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, ...usage }
  });

const endTurn = (text, usage = {}) =>
  message({
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 200, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 150, ...usage }
  });

const refusal = () =>
  message({
    content: [],
    stop_reason: 'refusal',
    stop_details: { type: 'refusal', category: 'general_harms', explanation: 'declined' },
    usage: { input_tokens: 50, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
  });

// A real SDK client over a scripted fetch: every POST pops the next canned response.
function scriptedClient(script) {
  const requests = [];
  const queue = [...script];
  const fetchImpl = async (url, init) => {
    requests.push({ url: String(url), headers: Object.fromEntries(new Headers(init.headers)), body: JSON.parse(init.body) });
    const next = queue.shift();
    if (!next) {
      const err = { type: 'error', error: { type: 'invalid_request_error', message: 'script exhausted' } };
      return new Response(JSON.stringify(err), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify(next), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } });
  };
  const client = new Anthropic({ apiKey: FAKE_KEY, fetch: fetchImpl, maxRetries: 0 });
  return { client, requests };
}

const scenario = {
  _label: 'synthetic',
  _note: 'Sample persona — synthetic. Fake scenario for the agent test.',
  id: 'test-scenario',
  arc_start: '2026-10-05',
  today: '2026-10-18',
  persona: { name: 'Sample', role: 'Sample role', years: 7, location: 'Nowhere', headline: 'Sample headline' },
  fields: { career: 'Career text', now: 'Now text', pull: 'Pull text' },
  skills: [{ id: 's1', name: 'Skill' }],
  roles: [{ id: 'r1', title: 'Role' }],
  fallback: { paths: [] },
  path: { role_id: 'r1', title: 'Role' },
  week: { actions: [{ id: 'a1', title: 'Act one', minutes: 20, day: 'Mon' }], pathId: 'r1', pathTitle: 'Role' },
  lifelog: [
    { id: 'l01', date: '2026-10-05', source: 'note', title: 'Scenario note', summary: 'From the scenario file.' },
    { id: 'l02', date: '2026-10-06', source: 'sms', title: 'Private text', summary: 'Disabled source.' }
  ],
  checkins: [{ actionId: 'a1', kind: 'done', day: 'Mon', date: '2026-10-13' }]
};

function fakeBrain(overrides = {}) {
  const calls = [];
  const record = (name, result) => (input) => {
    calls.push({ name, input });
    return typeof result === 'function' ? result(input) : result;
  };
  const brain = {
    think: record('think', { intervention: { kind: 'shrink', actionId: 'a1', minutes: 10 }, trace: ['internal'] }),
    rankRoles: record('rankRoles', { roles: [{ id: 'r1', ratio: 0.67 }], trace: ['internal'] }),
    planWeek: record('planWeek', { week: { actions: [] }, view: { actions: [] } }),
    checkIn: record('checkIn', { ok: true, week: { actions: [] }, brain: { intervention: { kind: 'full' }, trace: ['internal'] } }),
    analyzeState: record('analyzeState', { energy: 'medium', risk: { level: 'green', points: 0, reasons: [], checks: [] } }),
    explain: record('explain', { rules: ['risk_table'], evidence: ['l01'] }),
    ...overrides
  };
  return { brain, calls };
}

function makeAgent(script, options = {}) {
  const { client, requests } = scriptedClient(script);
  const { brain, calls } = fakeBrain(options.brain);
  const agent = createAgent({ brain, scenario: options.scenario ?? scenario, client, ledger: options.ledger });
  return { agent, requests, brainCalls: calls };
}

function lastToolResults(request) {
  const last = request.body.messages[request.body.messages.length - 1];
  return last.content.filter((block) => block.type === 'tool_result');
}

// ---------- pricing ----------

test('pricing: 1000 in / 500 out on claude-opus-5-5 costs 0.014', () => {
  assert.equal(costUsd(MODEL, { input_tokens: 1000, output_tokens: 500 }), 0.014);
});

test('pricing: cache read and cache write tiers are priced separately, 6 decimals', () => {
  const usage = { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 10_000, cache_creation_input_tokens: 2000 };
  // 0.004 + 0.010 + 0.002 + 0.010
  assert.equal(costUsd(MODEL, usage), 0.026);
  assert.equal(costUsd(MODEL, { input_tokens: 1 }), 0.000004);
  assert.equal(costUsd(MODEL, { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 1 }), round6((4 + 20 + 0.2) / 1e6));
  assert.equal(costUsd(MODEL, {}), 0);
  assert.equal(costUsd(MODEL, { input_tokens: -5, output_tokens: 'x' }), 0);
});

test('pricing: an unknown model is priced at the default model rates (never zero)', () => {
  assert.equal(DEFAULT_MODEL, MODEL);
  assert.deepEqual(PRICES[MODEL], { input: 4, output: 20, cache_read: 0.2, cache_write: 5 });
  assert.equal(costUsd('some-fallback-model', { input_tokens: 1000, output_tokens: 500 }), 0.014);
});

// ---------- ledger ----------

test('ledger: records per partner and in total, with an injectable clock', () => {
  let tick = 0;
  const ledger = createLedger({ now: () => `2026-10-24T10:00:0${tick++}Z` });
  ledger.record('alpha', { model: MODEL, input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, cost_usd: 0.014 });
  ledger.record('alpha', { model: MODEL, input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 400 }); // cost computed: 0.0004+0.001+0.00008
  ledger.record('beta', { model: MODEL, input_tokens: 10, output_tokens: 0 });

  const summary = ledger.summary();
  assert.deepEqual(Object.keys(summary.partners).sort(), ['alpha', 'beta']);
  assert.equal(summary.partners.alpha.calls, 2);
  assert.equal(summary.partners.alpha.input_tokens, 1100);
  assert.equal(summary.partners.alpha.output_tokens, 550);
  assert.equal(summary.partners.alpha.cache_read_input_tokens, 400);
  assert.equal(summary.partners.alpha.cost_usd, round6(0.014 + 0.00148));
  assert.equal(summary.partners.alpha.last_at, '2026-10-24T10:00:01Z');
  assert.equal(summary.partners.beta.calls, 1);
  assert.equal(summary.partners.beta.cost_usd, 0.00004);
  assert.equal(summary.total.calls, 3);
  assert.equal(summary.total.input_tokens, 1110);
  assert.equal(summary.total.cost_usd, round6(0.014 + 0.00148 + 0.00004));
  assert.equal(summary.total.last_at, '2026-10-24T10:00:02Z');

  // summary() hands out copies
  summary.partners.alpha.calls = 99;
  assert.equal(ledger.summary().partners.alpha.calls, 2);
  ledger.reset();
  assert.deepEqual(ledger.summary(), { partners: {}, total: { calls: 0, input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, cost_usd: 0, last_at: null } });
});

test('ledger: an empty partner key lands in the demo row', () => {
  const ledger = createLedger({ now: () => 't' });
  ledger.record('', { model: MODEL, input_tokens: 1 });
  ledger.record(undefined, { model: MODEL, input_tokens: 1 });
  assert.equal(ledger.summary().partners.demo.calls, 2);
});

// ---------- prompt helpers ----------

test('prompt: buildMessages keeps proper turns and always starts with a user message', () => {
  const fromAssistant = buildMessages({ history: [{ role: 'assistant', text: 'Hello.' }, { role: 'user', text: 'Hi.' }], userTurn: { source: 'user', text: 'Go on.' } });
  assert.deepEqual(fromAssistant, [
    { role: 'user', content: '[session start]' },
    { role: 'assistant', content: 'Hello.' },
    { role: 'user', content: 'Hi.' },
    { role: 'user', content: 'Go on.' }
  ]);
  const noTurn = buildMessages({ history: [{ role: 'user', text: 'Hi.' }, { role: 'assistant', text: 'Hello.' }], userTurn: null });
  assert.equal(noTurn[noTurn.length - 1].content, '[continue]');
  assert.deepEqual(buildMessages({}), [{ role: 'user', content: '[session start]' }]);
  const event = buildMessages({ history: [], userTurn: { source: 'checkin', text: 'a1 done' } });
  assert.deepEqual(event, [{ role: 'user', content: '[checkin] a1 done' }]);
  const firstTurn = buildMessages({ history: [], userTurn: { source: 'user', text: 'Hello' } });
  assert.deepEqual(firstTurn, [{ role: 'user', content: 'Hello' }]);
});

test('prompt: countUserTurns counts past user turns plus the new user turn, not events', () => {
  const history = [{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }, { role: 'user', text: 'c' }];
  assert.equal(countUserTurns(history, null), 2);
  assert.equal(countUserTurns(history, { source: 'user', text: 'd' }), 3);
  assert.equal(countUserTurns(history, { text: 'd' }), 3);
  assert.equal(countUserTurns(history, { source: 'checkin', text: 'a1 done' }), 2);
  assert.equal(countUserTurns([], { source: 'user', text: '   ' }), 0);
});

test('prompt: stripMarker removes the marker and reports it', () => {
  assert.deepEqual(stripMarker(`I think we are ready to look at paths. ${READY_MARKER}`), { text: 'I think we are ready to look at paths.', marked: true });
  assert.deepEqual(stripMarker('Plain reply.'), { text: 'Plain reply.', marked: false });
  assert.deepEqual(stripMarker(null), { text: '', marked: false });
});

test('prompt: the system prompt is stable English and forbids guessing, causes and failure words', () => {
  assert.match(SYSTEM_PROMPT, /You are the coach inside Dream Achieve Moments/);
  assert.match(SYSTEM_PROMPT, /ONLY from the tools/);
  assert.match(SYSTEM_PROMPT, /because you/);
  assert.match(SYSTEM_PROMPT, /ONE question at a time/);
  assert.match(SYSTEM_PROMPT, /2 to 4 sentences/);
  assert.ok(SYSTEM_PROMPT.includes(READY_MARKER));
  assert.doesNotMatch(SYSTEM_PROMPT, /\d{4}-\d{2}-\d{2}/, 'no dates in the cached block');
});

test('prompt: the context block shows only enabled sources and labels the data synthetic', () => {
  const block = buildContextBlock({ scenarioId: 'x', persona: scenario.persona, fields: scenario.fields, lifelog: scenario.lifelog, checkins: scenario.checkins, week: scenario.week, today: '2026-10-18' });
  assert.match(block, /synthetic/);
  assert.match(block, /Scenario: x\. Demo today: 2026-10-18/);
  assert.match(block, /l01 2026-10-05 \[note\] Scenario note/);
  assert.doesNotMatch(block, /Private text/, 'sms is not an enabled source');
  assert.match(block, /a1 Act one \(20 min\) Mon/);
  assert.match(block, /2026-10-13 a1 done/);
});

// ---------- createAgent ----------

test('createAgent: without a client or key the agent is disabled and chat() throws a clear error', async () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const { brain } = fakeBrain();
    const agent = createAgent({ brain, scenario });
    assert.equal(agent.enabled, false);
    assert.equal(agent.model, MODEL);
    await assert.rejects(agent.chat({ userTurn: { source: 'user', text: 'Hi' } }), /ANTHROPIC_API_KEY/);
    assert.deepEqual(agent.ledger.summary().partners, {});
  } finally {
    if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved;
  }
});

test('createAgent: enabled with an injected client or an explicit apiKey; brain is required', () => {
  const { brain } = fakeBrain();
  assert.equal(createAgent({ brain, scenario, client: scriptedClient([]).client }).enabled, true);
  assert.equal(createAgent({ brain, scenario, apiKey: FAKE_KEY }).enabled, true);
  assert.deepEqual(createAgent({ brain, scenario, apiKey: FAKE_KEY }).tools, TOOL_NAMES);
  assert.throws(() => createAgent({ scenario }), TypeError);
});

test('agent: the seven tools mirror the brain contract in a stable order', () => {
  assert.deepEqual(TOOL_NAMES, ['think', 'rank_roles', 'plan_week', 'check_in', 'analyze_state', 'explain', 'get_scenario']);
});

// ---------- chat: wiring ----------

test('chat: a tool call is executed with conversation defaults and its JSON result is fed back', async () => {
  const customLifelog = [{ id: 'c01', date: '2026-10-07', source: 'note', title: 'Custom note', summary: 'Passed by the caller.' }];
  const { agent, requests, brainCalls } = makeAgent([
    toolUse('analyze_state', {}),
    endTurn('Your week shows one action done so far. What gave you energy in that work?')
  ]);

  const result = await agent.chat({
    partnerKey: 'p1',
    scenarioId: 'test-scenario',
    persona: scenario.persona,
    lifelog: customLifelog,
    history: [],
    userTurn: { source: 'user', text: 'Hi, I just picked a path.' }
  });

  // the brain was called once, with the chat lifelog winning over the scenario's and the rest from the scenario
  assert.equal(brainCalls.length, 1);
  assert.equal(brainCalls[0].name, 'analyzeState');
  assert.equal(brainCalls[0].input.lifelog, customLifelog);
  assert.equal(brainCalls[0].input.checkins, scenario.checkins);
  assert.equal(brainCalls[0].input.today, '2026-10-18');
  assert.equal(brainCalls[0].input.arcStart, '2026-10-05');

  // two API requests; the second carries the assistant tool_use and our tool_result JSON
  assert.equal(requests.length, 2);
  const msgs = requests[1].body.messages;
  assert.deepEqual(msgs.map((m) => m.role), ['user', 'assistant', 'user']);
  assert.equal(msgs[0].content, 'Hi, I just picked a path.');
  assert.equal(msgs[1].content[0].type, 'tool_use');
  const [toolResult] = lastToolResults(requests[1]);
  assert.equal(toolResult.tool_use_id, 'tu_1');
  assert.notEqual(toolResult.is_error, true);
  const parsed = JSON.parse(toolResult.content);
  assert.equal(parsed.risk.level, 'green');

  // reply, flag, tool_calls, usage, trace
  assert.equal(result.reply.text, 'Your week shows one action done so far. What gave you energy in that work?');
  assert.equal(result.ready_for_paths, false);
  assert.equal(result.stop_reason, 'end_turn');
  assert.equal(result.tool_calls.length, 1);
  assert.equal(result.tool_calls[0].name, 'analyze_state');
  assert.equal(result.tool_calls[0].ok, true);
  assert.ok(Number.isInteger(result.tool_calls[0].ms) && result.tool_calls[0].ms >= 0);

  assert.equal(result.usage.model, MODEL);
  assert.equal(result.usage.input_tokens, 300);
  assert.equal(result.usage.output_tokens, 30);
  assert.equal(result.usage.cache_read_input_tokens, 150);
  assert.equal(result.usage.cache_creation_input_tokens, 0);
  assert.equal(result.usage.cost_usd, round6((300 * 4 + 30 * 20 + 150 * 0.2) / 1e6)); // 0.00183

  const modelTurns = result.trace.filter((t) => t.label.startsWith('model turn'));
  const toolTurns = result.trace.filter((t) => t.label === 'tool analyze_state');
  assert.equal(modelTurns.length, 2);
  assert.equal(toolTurns.length, 1);
  for (const entry of result.trace) {
    assert.equal(entry.layer, 'L3');
    assert.equal(entry.stage, 'interview');
    assert.equal(entry.status, 'ran');
    assert.ok(Number.isInteger(entry.ms));
  }

  // metering: one row for p1, equal to the total
  const summary = agent.ledger.summary();
  assert.equal(summary.partners.p1.calls, 1);
  assert.equal(summary.partners.p1.input_tokens, 300);
  assert.equal(summary.partners.p1.cost_usd, 0.00183);
  assert.equal(summary.total.cost_usd, 0.00183);
  assert.ok(typeof summary.partners.p1.last_at === 'string');
});

test('chat: the request carries the cached system block, tools first, fallback beta, low effort, no forced tool_choice', async () => {
  const { agent, requests } = makeAgent([endTurn('What gave you energy?')]);
  await agent.chat({ userTurn: { source: 'user', text: 'Hello' } });

  const { body, headers } = requests[0];
  assert.equal(body.model, MODEL);
  assert.equal(body.max_tokens, MAX_TOKENS);
  assert.equal(body.max_tokens, 2048);
  assert.equal(body.system[0].text, SYSTEM_PROMPT);
  assert.deepEqual(body.system[0].cache_control, { type: 'ephemeral' });
  assert.equal(body.system[1].cache_control, undefined);
  assert.match(body.system[1].text, /^CONTEXT \(synthetic demo data/);
  assert.match(body.system[1].text, /test-scenario/);
  assert.match(body.system[1].text, /name Sample/);
  assert.match(body.system[1].text, /l01 2026-10-05 \[note\]/);
  assert.doesNotMatch(body.system[1].text, /Private text/);

  assert.deepEqual(body.tools.map((t) => t.name), TOOL_NAMES);
  assert.equal(body.tools[0].input_schema.type, 'object');
  assert.ok(!body.tools.some((t) => typeof t.run === 'function'), 'run functions never go on the wire');
  const analyze = body.tools.find((t) => t.name === 'analyze_state');
  assert.ok(!analyze.input_schema.required || analyze.input_schema.required.length === 0, 'all analyze_state inputs optional');
  const checkIn = body.tools.find((t) => t.name === 'check_in');
  assert.deepEqual([...checkIn.input_schema.required].sort(), ['actionId', 'kind']);

  assert.equal(body.tool_choice, undefined);
  assert.equal(body.thinking, undefined);
  assert.equal(body.fallbacks, 'default');
  assert.deepEqual(body.output_config, { effort: 'low' });
  assert.notEqual(body.stream, true);
  assert.equal(body.thread, undefined, 'full history every turn, no message threads');
  assert.deepEqual(body.messages, [{ role: 'user', content: 'Hello' }]);

  assert.ok(headers['anthropic-beta'].split(',').map((s) => s.trim()).includes(BETAS[0]));
  assert.equal(BETAS[0], 'server-side-fallback-2026-07-01');
});

test('chat: history is sent as proper user/assistant turns', async () => {
  const { agent, requests } = makeAgent([endTurn('And what pulls you now?')]);
  const history = [
    { role: 'assistant', text: 'Welcome. What gave you energy?' },
    { role: 'user', text: 'Discovery calls.' },
    { role: 'assistant', text: 'Noted.' }
  ];
  await agent.chat({ history, userTurn: null });
  assert.deepEqual(requests[0].body.messages, [
    { role: 'user', content: '[session start]' },
    { role: 'assistant', content: 'Welcome. What gave you energy?' },
    { role: 'user', content: 'Discovery calls.' },
    { role: 'assistant', content: 'Noted.' },
    { role: 'user', content: '[continue]' }
  ]);
});

test('chat: usage is summed across every loop iteration (three API turns)', async () => {
  const { agent } = makeAgent([
    toolUse('rank_roles', {}, 'tu_1', { input_tokens: 1000, output_tokens: 50, cache_creation_input_tokens: 2000 }),
    toolUse('think', {}, 'tu_2', { input_tokens: 1500, output_tokens: 60, cache_read_input_tokens: 2000 }),
    endTurn('Here is what the overlap shows.', { input_tokens: 2500, output_tokens: 90, cache_read_input_tokens: 2000 })
  ]);
  const result = await agent.chat({ userTurn: { source: 'user', text: 'Rank me.' } });
  assert.equal(result.usage.input_tokens, 5000);
  assert.equal(result.usage.output_tokens, 200);
  assert.equal(result.usage.cache_creation_input_tokens, 2000);
  assert.equal(result.usage.cache_read_input_tokens, 4000);
  assert.equal(result.usage.cost_usd, round6((5000 * 4 + 200 * 20 + 2000 * 5 + 4000 * 0.2) / 1e6));
  assert.deepEqual(result.tool_calls.map((c) => [c.name, c.ok]), [['rank_roles', true], ['think', true]]);
});

test('chat: the model may override a default input; the rest still comes from the conversation', async () => {
  const { agent, brainCalls } = makeAgent([toolUse('analyze_state', { today: 'Fri', condition: 2 }), endTurn('ok')]);
  await agent.chat({ userTurn: { source: 'user', text: 'How am I doing on Friday?' } });
  assert.equal(brainCalls[0].input.today, 'Fri');
  assert.equal(brainCalls[0].input.condition, 2);
  assert.equal(brainCalls[0].input.lifelog, scenario.lifelog);
});

test('chat: brain results are passed through minus the internal trace', async () => {
  const { agent, requests } = makeAgent([toolUse('check_in', { actionId: 'a1', kind: 'done' }), endTurn('Logged.')]);
  await agent.chat({ userTurn: { source: 'user', text: 'I did a1.' } });
  const [toolResult] = lastToolResults(requests[1]);
  const parsed = JSON.parse(toolResult.content);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.trace, undefined);
  assert.equal(parsed.brain.trace, undefined);
  assert.equal(parsed.brain.intervention.kind, 'full');
});

test('chat: get_scenario returns the synthetic scenario without the catalogs', async () => {
  const { agent, requests } = makeAgent([toolUse('get_scenario', {}), endTurn('Got it.')]);
  const result = await agent.chat({ userTurn: { source: 'user', text: 'Load the demo.' } });
  const parsed = JSON.parse(lastToolResults(requests[1])[0].content);
  assert.equal(parsed._label, 'synthetic');
  assert.equal(parsed.id, 'test-scenario');
  assert.equal(parsed.skills, undefined);
  assert.equal(parsed.roles, undefined);
  assert.deepEqual(parsed._omitted, ['skills', 'roles', 'fallback']);
  assert.deepEqual(result.tool_calls.map((c) => c.name), ['get_scenario']);
});

test('chat: a failing brain function becomes an is_error tool_result and ok:false', async () => {
  const { agent, requests } = makeAgent(
    [toolUse('think', {}), endTurn('I could not run the full pass, so I will not guess.')],
    { brain: { think: () => { throw new Error('boom'); } } }
  );
  const result = await agent.chat({ userTurn: { source: 'user', text: 'Think.' } });
  const [toolResult] = lastToolResults(requests[1]);
  assert.equal(toolResult.is_error, true);
  assert.match(String(toolResult.content), /think failed: boom/);
  assert.deepEqual(result.tool_calls.map((c) => [c.name, c.ok]), [['think', false]]);
  assert.equal(result.reply.text, 'I could not run the full pass, so I will not guess.');
});

test('chat: a tool input that fails the zod schema never reaches the brain', async () => {
  const { agent, requests, brainCalls } = makeAgent([toolUse('check_in', { kind: 'done' }), endTurn('Which action was it?')]);
  const result = await agent.chat({ userTurn: { source: 'user', text: 'Done.' } });
  assert.equal(brainCalls.length, 0);
  assert.equal(lastToolResults(requests[1])[0].is_error, true);
  assert.deepEqual(result.tool_calls, []);
});

// ---------- chat: ready_for_paths ----------

test('ready_for_paths: true after three user answers even when the model sets no marker', async () => {
  const { agent } = makeAgent([endTurn('Thank you for those three answers.')]);
  const history = [
    { role: 'assistant', text: 'What gave you energy?' },
    { role: 'user', text: 'Calls.' },
    { role: 'assistant', text: 'What pulls you now?' },
    { role: 'user', text: 'Positioning work.' },
    { role: 'assistant', text: 'What is in the way?' }
  ];
  const result = await agent.chat({ history, userTurn: { source: 'user', text: 'Time.' } });
  assert.equal(result.ready_for_paths, true);
  assert.equal(result.reply.text, 'Thank you for those three answers.');
});

test('ready_for_paths: true when the reply carries the marker, and the marker is stripped', async () => {
  const { agent } = makeAgent([endTurn(`You asked for paths, so I am ready to show them. ${READY_MARKER}`)]);
  const result = await agent.chat({ userTurn: { source: 'user', text: 'Show me paths.' } });
  assert.equal(result.ready_for_paths, true);
  assert.equal(result.reply.text, 'You asked for paths, so I am ready to show them.');
  assert.ok(!result.reply.text.includes(READY_MARKER));
});

test('ready_for_paths: false with one answer and no marker; events do not count as answers', async () => {
  const one = makeAgent([endTurn('What pulls you now?')]);
  assert.equal((await one.agent.chat({ userTurn: { source: 'user', text: 'Calls.' } })).ready_for_paths, false);
  const events = makeAgent([endTurn('Logged.')]);
  const history = [{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }, { role: 'user', text: 'c' }];
  assert.equal((await events.agent.chat({ history, userTurn: { source: 'checkin', text: 'a1 done' } })).ready_for_paths, false);
});

// ---------- chat: refusal ----------

test('refusal: stop_reason refusal yields a reply that says it cannot continue, with no tool call', async () => {
  const { agent, requests, brainCalls } = makeAgent([refusal()]);
  const result = await agent.chat({ partnerKey: 'r1', userTurn: { source: 'user', text: 'Something out of scope.' } });
  assert.equal(result.stop_reason, 'refusal');
  assert.equal(result.reply.text, REFUSAL_REPLY);
  assert.match(result.reply.text, /can't continue/);
  assert.deepEqual(result.tool_calls, []);
  assert.equal(brainCalls.length, 0);
  assert.equal(result.ready_for_paths, false);
  assert.equal(requests.length, 1);
  assert.equal(result.usage.input_tokens, 50);
  assert.equal(agent.ledger.summary().partners.r1.calls, 1);
});

test('refusal: after a tool call the loop stops at the refusal and the fixed reply is returned', async () => {
  const { agent, requests } = makeAgent([toolUse('analyze_state', {}), refusal()]);
  const result = await agent.chat({ userTurn: { source: 'user', text: 'Hi' } });
  assert.equal(requests.length, 2);
  assert.equal(result.stop_reason, 'refusal');
  assert.equal(result.reply.text, REFUSAL_REPLY);
  assert.deepEqual(result.tool_calls.map((c) => c.name), ['analyze_state']);
  assert.equal(result.usage.input_tokens, 150);
});

// ---------- ledger wiring ----------

test('ledger: chat() meters every partner separately on a shared ledger', async () => {
  const ledger = createLedger({ now: () => '2026-10-24T11:00:00Z' });
  const a = makeAgent([endTurn('a')], { ledger });
  const b = makeAgent([endTurn('b'), endTurn('b2')], { ledger });
  await a.agent.chat({ partnerKey: 'alpha', userTurn: { source: 'user', text: 'x' } });
  await b.agent.chat({ partnerKey: 'beta', userTurn: { source: 'user', text: 'y' } });
  await b.agent.chat({ partnerKey: 'beta', userTurn: { source: 'user', text: 'z' } });
  const summary = ledger.summary();
  assert.equal(summary.partners.alpha.calls, 1);
  assert.equal(summary.partners.beta.calls, 2);
  assert.equal(summary.total.calls, 3);
  assert.equal(summary.total.input_tokens, 600);
  assert.equal(summary.total.cost_usd, round6(3 * (200 * 4 + 20 * 20 + 150 * 0.2) / 1e6));
  assert.equal(summary.partners.beta.last_at, '2026-10-24T11:00:00Z');
  assert.equal(a.agent.ledger, ledger);
});

// ---------- real brain through the tools (still no network) ----------

test('chat: the real brain and the real synthetic scenario run through think and analyze_state', async () => {
  const brain = await import('../index.js');
  const real = brain.loadScenario();
  const { client, requests } = scriptedClient([
    toolUse('analyze_state', {}, 'tu_1'),
    toolUse('think', {}, 'tu_2'),
    endTurn('Here is where this week stands.')
  ]);
  const agent = createAgent({ brain, scenario: real, client });
  const result = await agent.chat({
    partnerKey: 'real',
    scenarioId: real.id,
    persona: real.persona,
    lifelog: real.lifelog,
    history: [],
    userTurn: { source: 'user', text: 'How does my week look?' },
    today: real.today
  });

  assert.deepEqual(result.tool_calls.map((c) => [c.name, c.ok]), [['analyze_state', true], ['think', true]]);
  const state = JSON.parse(lastToolResults(requests[1])[0].content);
  assert.ok(['green', 'yellow', 'orange', 'red'].includes(state.risk.level), `risk level ${state.risk.level}`);
  assert.equal(state.today, real.today);
  const report = JSON.parse(lastToolResults(requests[2])[0].content);
  assert.ok(report.intervention && typeof report.intervention.kind === 'string');
  assert.ok(typeof report.intervention.message === 'object');
  assert.equal(report.trace, undefined);
  assert.equal(report.context.today, real.today);
  assert.equal(report.context.lifelogCount, real.lifelog.filter((i) => ['note', 'saved_link', 'calendar'].includes(i.source)).length);
  assert.match(requests[0].body.system[1].text, /Scenario: dana-copywriter/);
  assert.match(requests[0].body.system[1].text, /synthetic/);
});

// ---------- live smoke (RUN_LIVE=1 only; never fails CI) ----------

const LIVE = process.env.RUN_LIVE === '1';

test('live smoke: one real chat turn with the real brain', { skip: LIVE ? false : 'set RUN_LIVE=1 to run against the API' }, async () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    try {
      process.loadEnvFile(new URL('../.env', import.meta.url));
    } catch {
      // no .env: the assertion below reports the missing key without printing anything
    }
  }
  assert.ok(process.env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY must be set (brain/.env) for the live smoke test');

  const brain = await import('../index.js');
  const real = brain.loadScenario();
  const agent = createAgent({ brain, scenario: real });
  assert.equal(agent.enabled, true);

  const result = await agent.chat({
    partnerKey: 'live-smoke',
    scenarioId: real.id,
    persona: real.persona,
    lifelog: real.lifelog,
    history: [],
    userTurn: { source: 'user', text: 'Hi. I just picked the messaging consultant path. How does this week look so far?' },
    today: real.today
  });

  assert.ok(result.reply.text.length > 0, 'reply text');
  assert.ok(result.usage.input_tokens > 0, 'input tokens');
  assert.ok(result.usage.cost_usd > 0, 'cost');
  assert.equal(typeof result.ready_for_paths, 'boolean');
  assert.doesNotMatch(result.reply.text, /\b(failed|failure|streak|should have|lazy|because you)\b/i);
  // Safe to print: counters only, never the key.
  console.log('live smoke usage', JSON.stringify(result.usage), 'tools', result.tool_calls.map((c) => `${c.name}:${c.ok}:${c.ms}ms`).join(' '));
});
