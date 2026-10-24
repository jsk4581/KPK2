// wiring.test.mjs — the integration step: what think() / planWeek() / jobReadiness() wire together
// (goal re-check with today, goal version history, evidence ledger + readiness, crisis pause,
// escalation sentence, if-then lines, scenario ids) and the MCP/REST surface for it (8 tools,
// /v1/job-readiness, /v1/scenario?id=maya, the Explorer page). Synthetic data only.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import * as brainCore from '../index.js';
import { think, planWeek, jobReadiness, loadScenario, SCENARIO_IDS } from '../index.js';
import { createBrainServer, TOOL_NAMES, validateInput } from '../mcp/server.js';
import { startHttp } from '../mcp/http.js';
import { CRISIS_TEXT } from '../policy.js';
import { ESCALATION_MESSAGES } from '../monitor.js';
import { lint, BANNED_WORDS } from '../messages.js';
import { SYSTEM_PROMPT, serializeToolResult, TOOL_RESULT_SOFT_LIMIT } from '../agent/index.js';

const scenario = loadScenario();
const silent = () => {};

describe('think: goal state re-check and version history', () => {
  const gates = [
    { id: 'M1', name: 'Fit', week: 2, date: '2026-10-19', passed: true },
    { id: 'M2', name: 'Proof', week: 6, date: '2026-10-20', passed: false },
    { id: 'M3', name: 'Market', week: 9, date: '2026-11-10', passed: false },
    { id: 'M4', name: 'Ready', week: 12, date: '2026-12-01', passed: false },
  ];

  test('today reaches goalState: a due gate not passed turns validated back into provisional', () => {
    const before = think({ path: scenario.path, gates, today: '2026-10-19' });
    const after = think({ path: scenario.path, gates, today: '2026-10-21' });
    assert.equal(before.goal.state, 'validated');
    assert.equal(after.goal.state, 'provisional');
  });

  test('goal.version / history: one entry at the demo today when the state changes, none otherwise', () => {
    const first = think(scenario);
    assert.equal(first.goal.version, 1);
    assert.deepEqual(first.goal.history, [{ at: scenario.today, from: null, to: 'provisional', reason: 'path chosen, no gate passed yet' }]);
    assert.deepEqual(first.goal.notNow, []);

    const same = think({ ...scenario, goalHistory: { version: first.goal.version, history: first.goal.history, not_now: first.goal.notNow } });
    assert.equal(same.goal.version, 1);
    assert.deepEqual(same.goal.history, first.goal.history);

    const validated = think({ ...scenario, confirmedGates: ['M1'], goalHistory: first.goal.history, notNow: ['podcast', 'podcast', ' '] });
    assert.equal(validated.goal.state, 'validated');
    assert.equal(validated.goal.version, 2);
    assert.equal(validated.goal.history[1].from, 'provisional');
    assert.equal(validated.goal.history[1].to, 'validated');
    assert.equal(validated.goal.history[1].gateId, 'M1');
    assert.equal(validated.goal.history[1].at, scenario.today);
    assert.deepEqual(validated.goal.notNow, ['podcast']);
  });

  test('no goal, no version: an empty input has version 0 and an empty history', () => {
    const report = think({});
    assert.equal(report.goal.state, 'ambiguous');
    assert.equal(report.goal.version, 0);
    assert.deepEqual(report.goal.history, []);
  });
});

describe('think: evidence ledger and job readiness', () => {
  const report = think(scenario);

  test('ledger comes from done check-ins only and readiness rests on it', () => {
    assert.equal(report.ledger.count, scenario.checkins.filter((c) => c.kind === 'done').length);
    assert.ok(report.ledger.entries.every((e) => e.kind === 'done' || e.kind === 'micro'));
    assert.ok(report.readiness.score >= 0 && report.readiness.score <= 100);
    assert.equal(report.readiness.level, 'build-proof');
    assert.equal(report.readiness.next_gate.id, 'M1');
    assert.ok(report.trace.some((t) => t.fn === 'buildLedger' && t.via === 'brain'));
    assert.ok(report.trace.some((t) => t.fn === 'readinessScore' && t.via === 'brain'));
  });

  test('jobReadiness(input) is the success -> work slice of the same pass', () => {
    const out = jobReadiness(scenario);
    assert.deepEqual(out.readiness, report.readiness);
    assert.deepEqual(out.ledger, report.ledger);
    assert.equal(out.goal.state, report.goal.state);
    assert.equal(out.goal.version, report.goal.version);
    assert.deepEqual(out.goal.milestones.map((g) => g.id), ['M1', 'M2', 'M3', 'M4']);
    assert.equal(out.today, scenario.today);
    assert.deepEqual(out.trace.map((t) => t.fn), ['buildLedger', 'readinessScore']);
    assert.deepEqual(jobReadiness(scenario), out);
  });

  test('an explicit market input reaches the score', () => {
    const withMarket = think({ ...scenario, market: { reachOuts: 3, applications: 2 } });
    assert.equal(withMarket.readiness.components.market, 20);
    assert.equal(report.readiness.components.market, 0);
  });
});

describe('think: escalations from the weekly review', () => {
  test('crisis language -> pause: no action, no choices, the fixed support text, lint ok', () => {
    const report = think({ ...scenario, freeText: 'some days I want to end my life' });
    assert.equal(report.monitor.review.escalate.reason, 'crisis_language');
    assert.equal(report.intervention.kind, 'pause');
    assert.equal(report.intervention.actionId, null);
    assert.deepEqual(report.intervention.choices, []);
    assert.equal(report.intervention.message.text, CRISIS_TEXT);
    assert.equal(report.intervention.message.key, 'CRISIS_SUPPORT');
    assert.equal(report.intervention.message.lint.ok, true);
    assert.ok(!JSON.stringify(report.intervention).includes('end my life'), 'the typed words never reach the decision');
  });

  test('economic pressure -> the resource sentence is appended after the next-step line; coaching continues', () => {
    const report = think({ ...scenario, freeText: 'I cannot pay rent this month' });
    assert.equal(report.monitor.review.escalate.reason, 'economic_pressure');
    assert.notEqual(report.intervention.kind, 'pause');
    assert.equal(report.intervention.choices.length, 2);
    const { message } = report.intervention;
    assert.equal(message.escalation.reason, 'economic_pressure');
    assert.equal(message.escalation.message, ESCALATION_MESSAGES.economic_pressure);
    const lines = message.text.split('\n');
    assert.equal(lines.at(-1), ESCALATION_MESSAGES.economic_pressure);
    assert.equal(lines.slice(0, -1).join('\n'), [message.ack, message.reframe, message.next].filter(Boolean).join('\n'));
    assert.equal(message.lint.ok, true);
    assert.equal(lint(message.text).ok, true);
  });

  test('no escalation -> no escalation field, text unchanged', () => {
    const report = think(scenario);
    assert.equal(report.monitor.review.escalate, null);
    assert.equal(report.intervention.message.escalation, undefined);
  });
});

describe('planWeek: if-then lines', () => {
  test('every action carries ifThen (day only, no anchor guessed) and milestone M1; the view keeps them', () => {
    const out = planWeek({ path: scenario.path, today: '2026-10-12' });
    assert.equal(out.week.actions.length, 3);
    for (const action of out.week.actions) {
      assert.match(action.ifThen, new RegExp(`^On ${action.day}, I will `));
      assert.equal(action.milestone, 'M1');
      assert.equal(action.dependsOnPerson, false);
    }
    assert.ok(out.view.every((a) => typeof a.ifThen === 'string'));
    const anchored = planWeek({ path: scenario.path, today: 'Mon', anchor: 'morning coffee' });
    assert.match(anchored.week.actions[0].ifThen, /^On Tue after morning coffee, I will /);
  });
});

describe('loadScenario(id)', () => {
  test('dana by default, maya on request, unknown ids throw', () => {
    assert.deepEqual(SCENARIO_IDS, ['dana', 'maya']);
    assert.equal(loadScenario().id, scenario.id);
    assert.equal(loadScenario('dana').id, scenario.id);
    const maya = loadScenario('maya');
    assert.equal(maya.id, 'maya-copywriter-bakery');
    assert.equal(maya._label, 'synthetic');
    assert.throws(() => loadScenario('nope'), /unknown scenario: nope/);
  });

  test('think runs on maya and stays lint-clean', () => {
    const report = think(loadScenario('maya'));
    assert.equal(report.intervention.message.lint.ok, true);
    assert.ok(report.readiness.score >= 0);
  });
});

describe('agent layer: prompt and tool_result compaction', () => {
  test('the system prompt lists the lint\'s own banned words and asks for a first-turn think call', () => {
    for (const word of BANNED_WORDS) assert.ok(SYSTEM_PROMPT.includes(word), word);
    assert.match(SYSTEM_PROMPT, /At the first turn of a session, call the think tool once/);
    assert.match(SYSTEM_PROMPT, /answer only after the relevant tool call/);
  });

  test('a large think report keeps its judgment fields and context scalars; trace is always removed', () => {
    const report = think(scenario);
    assert.ok(JSON.stringify(report).length > TOOL_RESULT_SOFT_LIMIT);
    const compact = JSON.parse(serializeToolResult(report));
    assert.equal(compact.trace, undefined);
    assert.equal(compact.context.today, scenario.today);
    assert.equal(compact.context.lifelogCount, report.context.lifelogCount);
    assert.equal(compact.context.week, undefined);
    assert.equal(compact.monitor.review.compare, undefined);
    assert.deepEqual(compact.intervention, report.intervention);
    assert.deepEqual(compact.state, report.state);
    assert.deepEqual(compact.readiness, report.readiness);
    const small = JSON.parse(serializeToolResult({ trace: [], context: { week: { actions: [] } }, ok: true }));
    assert.deepEqual(small, { context: { week: { actions: [] } }, ok: true });
  });
});

describe('MCP + REST surface for the wiring', () => {
  const brain = { ...brainCore.default, scenario };
  let http;
  let base;

  before(async () => {
    http = await startHttp({ brainServerFactory: () => createBrainServer(brain), brain, port: 0, log: silent, rateLimit: { limit: 1000, windowMs: 60_000 } });
    base = http.url;
  });

  after(async () => {
    await http.close();
  });

  test('8 tools, job_readiness before get_scenario; thinkShape keeps the new optional keys', () => {
    assert.deepEqual(TOOL_NAMES, ['think', 'rank_roles', 'plan_week', 'check_in', 'analyze_state', 'explain', 'job_readiness', 'get_scenario']);
    const parsed = validateInput('think', {
      today: 'Thu',
      confirmedGates: ['M1'],
      goalHistory: { version: 1, history: [{ at: '2026-10-18', from: null, to: 'provisional', reason: 'x' }], not_now: ['a'] },
      constraints: { hoursPerWeek: 10, runwayMonths: 3, careDuties: true },
      adaptability4c: { concern: 3, control: 4, curiosity: 5, confidence: 2 },
      notNow: ['podcast'],
      freeText: 'note',
      market: { reachOuts: 1, applications: 0 },
    });
    assert.equal(parsed.ok, true, parsed.error);
    for (const key of ['confirmedGates', 'goalHistory', 'constraints', 'adaptability4c', 'notNow', 'freeText', 'market']) assert.ok(key in parsed.data, key);
    assert.equal(validateInput('get_scenario', { id: 'maya' }).ok, true);
    assert.equal(validateInput('get_scenario', { id: 'nope' }).ok, false);
  });

  test('GET /v1/health lists 8 tools; POST /v1/job-readiness answers with the score', async () => {
    const health = await (await fetch(`${base}/v1/health`)).json();
    assert.equal(health.tools.length, 8);
    assert.ok(health.tools.includes('job_readiness'));
    const res = await fetch(`${base}/v1/job-readiness`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(scenario) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.readiness.score, 'number');
    assert.equal(body.readiness.level, 'build-proof');
    assert.equal(body.ledger.count, 6);
    assert.equal(body.goal.state, 'provisional');
  });

  test('GET /v1/scenario?id=maya serves the 21-day scenario; unknown id -> 400; no id -> dana', async () => {
    const maya = await fetch(`${base}/v1/scenario?id=maya`);
    assert.equal(maya.status, 200);
    assert.equal((await maya.json()).id, 'maya-copywriter-bakery');
    const dana = await (await fetch(`${base}/v1/scenario`)).json();
    assert.equal(dana.id, scenario.id);
    const bad = await fetch(`${base}/v1/scenario?id=nope`);
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error.code, 'invalid_input');
  });

  test('GET / and GET /explorer serve the Explorer page without a token; /public/* too', async () => {
    for (const path of ['/', '/explorer', '/public/explorer.html']) {
      const res = await fetch(`${base}${path}`);
      assert.equal(res.status, 200, path);
      assert.match(res.headers.get('content-type'), /text\/html/);
      assert.match(await res.text(), /<html/i);
    }
    assert.equal((await fetch(`${base}/public/nope.css`)).status, 404);
  });

  test('MCP: get_scenario {id: maya} and job_readiness through the SDK client', async () => {
    const client = new Client({ name: 'wiring-test', version: '0.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`));
    await client.connect(transport);
    try {
      const { tools } = await client.listTools();
      assert.equal(tools.length, 8);
      const maya = await client.callTool({ name: 'get_scenario', arguments: { id: 'maya' } });
      assert.equal(maya.structuredContent.id, 'maya-copywriter-bakery');
      const dana = await client.callTool({ name: 'get_scenario', arguments: {} });
      assert.equal(dana.structuredContent.id, scenario.id);
      const jr = await client.callTool({ name: 'job_readiness', arguments: { today: scenario.today, path: scenario.path, week: scenario.week, checkins: scenario.checkins, lifelog: scenario.lifelog } });
      assert.equal(jr.isError, undefined);
      assert.equal(jr.structuredContent.readiness.level, 'build-proof');
    } finally {
      await client.close();
    }
  });
});
