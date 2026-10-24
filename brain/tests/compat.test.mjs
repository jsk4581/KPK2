// compat.test.mjs — Build's web↔brain contract (/v1/interview, /v1/paths, /v1/plan, /v1/checkin,
// /v1/voice/token) served by the real brain (index.js) behind the real http.js on port 0.
// Fixtures are synthetic: the lifelog is app/data/persona-dana.json re-shaped to Build's
// {id, ts, source, title, summary, media, url} items. Sample persona — synthetic.
// Run: cd brain && node --test tests/
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as brainCore from '../index.js';
import { createBrainServer } from '../mcp/server.js';
import { startHttp } from '../mcp/http.js';
import { mapLifelogItem, specMoveTarget, resolveToday, weekStartOf, COMPAT_ROUTES, DEFAULT_WEEK_START } from '../mcp/compat.js';
import { lint } from '../messages.js';
import { WEEK_DAYS, NEXT_WEEK, REST_DAY_LINE, checkableActions, applyCheckin } from '../../app/logic.js';

const persona = JSON.parse(readFileSync(new URL('../../app/data/persona-dana.json', import.meta.url), 'utf8'));
const brain = { ...brainCore.default, scenario: brainCore.loadScenario() };

// The vendor word must never appear in any response; the regex is assembled so it is not written here.
const FORBIDDEN = new RegExp(['Gem', 'ini'].join('') + '|' + ['제미', '나이'].join(''), 'i');
const LAYERS = ['L1', 'L2', 'L3', 'L4'];
const STAGES = ['ingest', 'scrub', 'graph', 'interview', 'paths', 'plan', 'checkin', 'adjust'];

// Build-shape lifelog: ts instead of date, Build's source names (messenger/sms → message).
const BUILD_SOURCE = { messenger: 'message', sms: 'message' };
const lifelog = persona.lifelog.map((item) => ({
  id: item.id,
  ts: `${item.date}T09:00:00-05:00`,
  source: BUILD_SOURCE[item.source] || item.source,
  title: item.title,
  summary: item.summary,
  media: null,
  url: item.url,
}));
lifelog.push(
  { id: 'l90', ts: '2026-10-22T07:00:00-05:00', source: 'health', title: 'Sleep 7h', summary: 'Slept seven hours.', media: null, url: null },
  { id: 'l91', ts: '2026-10-22T12:00:00-05:00', source: 'voice_memo', title: 'Memo after the call', summary: 'The discovery call ran long and I liked it.', media: null, url: null },
);
const lifelogIds = new Set(lifelog.map((item) => item.id));

const SCRIPT = [
  'Three of five retainer clients now draft with AI and send polish-only jobs at a third of the rate.',
  'They kept me because I could run a discovery call and turn founder talk into a positioning line customers repeat back.',
  'The discovery calls and the workshop questions pull me more than writing the drafts.',
];

const base = { scenario_id: persona.id, persona: persona.persona, lifelog, history: [] };
const silent = () => {};
let open;
let tokenServer;
let url;

function post(path, body, headers = {}) {
  return fetch(`${url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }).then(async (res) => ({ status: res.status, body: await res.json(), headers: res.headers }));
}

function collectText(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectText(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectText(v, out));
  return out;
}

function assertTrace(trace) {
  assert.ok(Array.isArray(trace) && trace.length > 0, 'trace is a non-empty array');
  for (const step of trace) {
    assert.ok(LAYERS.includes(step.layer), `layer ${step.layer}`);
    assert.ok(STAGES.includes(step.stage), `stage ${step.stage}`);
    assert.equal(typeof step.label, 'string');
    assert.equal(typeof step.input_summary, 'string');
    assert.equal(typeof step.output_summary, 'string');
    assert.ok(step.status === 'ran' || step.status === 'designed', `status ${step.status}`);
    if (step.status === 'ran') assert.equal(typeof step.ms, 'number', `ran step "${step.label}" has numeric ms`);
    else assert.equal(step.ms, null, `designed step "${step.label}" has ms null`);
  }
  assert.ok(trace.some((s) => s.status === 'ran'), 'at least one step ran');
}

function assertClean(body) {
  for (const text of collectText(body)) assert.doesNotMatch(text, FORBIDDEN);
}

// A plan in the contract shape with custom days (today = Thu in every check-in example).
function planWith(days, extra = {}) {
  return {
    path_id: 'p1',
    north_star: 'n',
    quarter: 'q',
    week: {
      start: '2026-10-20',
      actions: days.map((day, i) => ({ id: `a${i + 1}`, title: `Action ${i + 1}`, minutes: 20 + i, day, status: 'todo', moves: 0, short: `Short ${i + 1}` })),
    },
    summary: '0/3 done',
    ...extra,
  };
}
const PATH = { id: 'p1', title: 'Messaging & Positioning Consultant', one_liner: 'x', transfers: [], missing: [], first_two_weeks: [] };

function checkin(plan, actionId, kind, today = 'Thu') {
  return post('/v1/checkin', { scenario_id: persona.id, persona: persona.persona, path: PATH, plan, today, action_id: actionId, kind });
}

// Run the interview to the end once; the history is reused by the paths/plan tests.
async function runInterview() {
  const first = await post('/v1/interview', { ...base, user_turn: null });
  const history = [{ role: 'agent', text: first.body.reply.text }];
  const replies = [first];
  for (const line of SCRIPT) {
    const res = await post('/v1/interview', { ...base, history, user_turn: { source: 'script', text: line } });
    replies.push(res);
    history.push({ role: 'user', text: line, source: 'script' }, { role: 'agent', text: res.body.reply.text });
  }
  return { replies, history };
}

before(async () => {
  open = await startHttp({
    brainServerFactory: () => createBrainServer(brain),
    brain,
    port: 0,
    log: silent,
    rateLimit: { limit: 100_000, windowMs: 60_000 },
  });
  url = open.url;
  tokenServer = await startHttp({ brainServerFactory: () => createBrainServer(brain), brain, port: 0, token: 'demo-secret', log: silent });
});

after(async () => {
  await Promise.all([open.close(), tokenServer.close()]);
});

describe('lifelog mapping', () => {
  test('Build item → logic item: date from ts, message → messenger, health/voice_memo → note with the original kept in tags', () => {
    const msg = mapLifelogItem({ id: 'x1', ts: '2026-10-20T21:14:00-05:00', source: 'message', title: 't', summary: 's', media: null, url: null });
    assert.equal(msg.date, '2026-10-20');
    assert.equal(msg.source, 'messenger');
    assert.deepEqual(msg.tags, ['message']);
    for (const source of ['health', 'location', 'app_usage', 'voice_memo']) {
      const mapped = mapLifelogItem({ id: 'x2', ts: '2026-10-21T08:00:00Z', source, title: '', summary: '' });
      assert.equal(mapped.source, 'note');
      assert.deepEqual(mapped.tags, [source]);
    }
    for (const source of ['photo', 'saved_link', 'document', 'calendar', 'note']) {
      assert.equal(mapLifelogItem({ id: 'x3', ts: '2026-10-21T08:00:00Z', source }).source, source);
    }
    const dated = mapLifelogItem({ id: 'x4', date: '2026-10-09', source: 'note', tags: ['a'] });
    assert.equal(dated.date, '2026-10-09');
    assert.deepEqual(dated.tags, ['a']);
  });

  test('resolveToday and weekStartOf', () => {
    assert.equal(resolveToday('Thu'), 'Thu');
    assert.equal(resolveToday('2026-10-22'), 'Thu');
    assert.equal(resolveToday('Someday'), null);
    assert.equal(weekStartOf({}), DEFAULT_WEEK_START);
    assert.equal(weekStartOf({ today: '2026-10-22' }), '2026-10-19');
    assert.equal(weekStartOf({ arc_start: '2026-10-05', today: 'Thu' }), '2026-10-05');
    assert.equal(weekStartOf({ week_start: '2026-10-07' }), '2026-10-05');
  });
});

describe('POST /v1/interview', () => {
  test('first call (user_turn null) greets with the lifelog count and asks question 1; not ready', async () => {
    const res = await post('/v1/interview', { ...base, user_turn: null });
    assert.equal(res.status, 200);
    assert.match(res.body.reply.text, new RegExp(`^Already in your agent: ${lifelog.length} items`));
    assert.match(res.body.reply.text, /health entry/);
    assert.match(res.body.reply.text, /What changed in your work/);
    assert.equal(res.body.ready_for_paths, false);
    assert.equal(lint(res.body.reply.text).ok, true);
    assertTrace(res.body.trace);
    assert.ok(res.body.trace.some((s) => s.layer === 'L3' && s.stage === 'interview' && s.status === 'ran'));
    assert.ok(res.body.trace.some((s) => s.layer === 'L2' && s.stage === 'graph' && s.status === 'designed'));
    assertClean(res.body);
  });

  test('three user turns walk the fixed question list, then ready_for_paths is true', async () => {
    const { replies } = await runInterview();
    assert.match(replies[1].body.reply.text, /keeping you for/);
    assert.equal(replies[1].body.ready_for_paths, false);
    assert.match(replies[2].body.reply.text, /What pulls you/);
    assert.equal(replies[2].body.ready_for_paths, false);
    assert.equal(replies[3].body.ready_for_paths, true);
    assert.match(replies[3].body.reply.text, /See my paths/);
    for (const r of replies) {
      assert.equal(r.status, 200);
      assert.equal(lint(r.body.reply.text).ok, true, r.body.reply.text);
      assertTrace(r.body.trace);
      assertClean(r.body);
    }
    // The ack reflects catalog skills, never the user's words.
    assert.match(replies[2].body.reply.text, /^I hear .* in that\./);
  });

  test('history with three user turns and user_turn null → ready; a voice turn is accepted', async () => {
    const history = SCRIPT.flatMap((text) => [{ role: 'user', text, source: 'script' }, { role: 'agent', text: 'ok' }]);
    const res = await post('/v1/interview', { ...base, history, user_turn: null });
    assert.equal(res.status, 200);
    assert.equal(res.body.ready_for_paths, true);
    const voice = await post('/v1/interview', { ...base, history: [], user_turn: { source: 'voice', text: 'I mostly polish AI drafts now.' } });
    assert.equal(voice.status, 200);
    assert.equal(voice.body.ready_for_paths, false);
    assert.match(voice.body.reply.text, /keeping you for/);
  });

  test('deterministic: the same request gives the same reply text', async () => {
    const body = { ...base, history: [{ role: 'user', text: SCRIPT[0], source: 'script' }], user_turn: { source: 'script', text: SCRIPT[1] } };
    const a = await post('/v1/interview', body);
    const b = await post('/v1/interview', body);
    assert.equal(a.body.reply.text, b.body.reply.text);
    assert.equal(a.body.ready_for_paths, b.body.ready_for_paths);
  });

  test('empty lifelog still answers', async () => {
    const res = await post('/v1/interview', { scenario_id: 'x', persona: {}, lifelog: [], history: [], user_turn: null });
    assert.equal(res.status, 200);
    assert.match(res.body.reply.text, /What changed in your work/);
  });
});

describe('POST /v1/paths', () => {
  test('exactly three paths with unique ids, evidence from the request lifelog, fallback copy for catalog roles', async () => {
    const { history } = await runInterview();
    const res = await post('/v1/paths', { ...base, history });
    assert.equal(res.status, 200);
    const { paths } = res.body;
    assert.equal(paths.length, 3);
    assert.deepEqual(paths.map((p) => p.id), ['p1', 'p2', 'p3']);
    const catalogTitles = new Set(persona.roles.map((r) => r.title));
    for (const p of paths) {
      assert.ok(catalogTitles.has(p.title), p.title);
      assert.equal(typeof p.one_liner, 'string');
      assert.ok(p.one_liner.length > 0);
      assert.ok(Array.isArray(p.first_two_weeks) && p.first_two_weeks.length >= 2);
      assert.ok(Array.isArray(p.missing));
      for (const t of p.transfers) {
        assert.equal(typeof t.skill, 'string');
        assert.ok(Array.isArray(t.evidence));
        for (const id of t.evidence) assert.ok(lifelogIds.has(id), `evidence ${id} is a lifelog id`);
      }
      for (const text of [p.one_liner, ...p.first_two_weeks]) assert.equal(lint(text).ok, true, text);
      const fallback = persona.fallback.paths.find((f) => persona.roles.find((r) => r.id === f.role_id).title === p.title);
      assert.equal(p.one_liner, fallback.one_liner);
    }
    assert.equal(paths[0].title, 'Messaging & Positioning Consultant');
    assert.ok(paths[0].transfers.some((t) => t.evidence.length > 0), 'p1 has lifelog evidence');
    assertTrace(res.body.trace);
    assert.ok(res.body.trace.some((s) => s.stage === 'paths' && s.status === 'ran'));
    assertClean(res.body);
  });

  test('deterministic and works with no history', async () => {
    const a = await post('/v1/paths', { ...base });
    const b = await post('/v1/paths', { ...base });
    assert.equal(a.status, 200);
    assert.deepEqual(a.body.paths, b.body.paths);
  });
});

describe('POST /v1/plan', () => {
  test('three actions ≤30 min from the fallback copy, 3-tier goal, week.start default', async () => {
    const paths = (await post('/v1/paths', { ...base })).body.paths;
    const path = paths[0];
    const res = await post('/v1/plan', { ...base, path, today: 'Thu' });
    assert.equal(res.status, 200);
    const { plan } = res.body;
    assert.equal(plan.path_id, path.id);
    assert.equal(typeof plan.north_star, 'string');
    assert.equal(typeof plan.quarter, 'string');
    assert.match(plan.north_star, /Ready to apply or pitch/);
    assert.match(plan.quarter, /M1 Fit \(week 2\)/);
    assert.equal(plan.week.start, '2026-10-20');
    assert.equal(plan.week.actions.length, 3);
    assert.deepEqual(plan.week.actions.map((a) => a.id), ['a1', 'a2', 'a3']);
    for (const a of plan.week.actions) {
      assert.ok(a.minutes <= 30 && a.minutes >= 1);
      assert.ok(WEEK_DAYS.includes(a.day));
      assert.equal(a.status, 'todo');
      assert.equal(a.moves, 0);
      assert.equal(typeof a.short, 'string');
    }
    const fallback = persona.fallback.paths.find((f) => f.role_id === 'messaging-consultant');
    assert.deepEqual(plan.week.actions.map((a) => a.title), fallback.week.actions.map((a) => a.title));
    assert.equal(plan.summary, '0/3 done');
    for (const text of [plan.north_star, plan.quarter]) assert.equal(lint(text).ok, true, text);
    assertTrace(res.body.trace);
    assert.ok(res.body.trace.some((s) => s.stage === 'plan' && s.status === 'ran'));
    assert.ok(res.body.trace.some((s) => s.status === 'designed'));
    assertClean(res.body);
  });

  test('week.start is the Monday of an ISO today or arc_start when given', async () => {
    const path = (await post('/v1/paths', { ...base })).body.paths[1];
    const iso = await post('/v1/plan', { ...base, path, today: '2026-10-22' });
    assert.equal(iso.status, 200);
    assert.equal(iso.body.plan.week.start, '2026-10-19');
    const arc = await post('/v1/plan', { ...base, path, today: 'Thu', arc_start: '2026-10-05' });
    assert.equal(arc.body.plan.week.start, '2026-10-05');
  });

  test('a path outside the catalog gets a neutral three-action week', async () => {
    const path = { id: 'p3', title: 'Technical Translator', one_liner: 'x', transfers: [], missing: [], first_two_weeks: ['Read two job posts.', 'Translate one page.'] };
    const res = await post('/v1/plan', { ...base, path, today: 'Mon' });
    assert.equal(res.status, 200);
    assert.equal(res.body.plan.week.actions.length, 3);
    assert.equal(res.body.plan.week.actions[0].title, 'Read two job posts.');
    for (const a of res.body.plan.week.actions) assert.ok(a.minutes <= 30);
    assert.match(res.body.plan.north_star, /Technical Translator/);
  });

  test('bad today → 400 invalid_today; missing path → 400 invalid_input', async () => {
    const bad = await post('/v1/plan', { ...base, path: PATH, today: 'Someday' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, 'invalid_today');
    const missing = await post('/v1/plan', { ...base, today: 'Thu' });
    assert.equal(missing.status, 400);
    assert.equal(missing.body.error.code, 'invalid_input');
    assert.match(missing.body.error.message, /path/);
  });
});

describe('POST /v1/checkin (spec §3.4, today = Thu)', () => {
  test('Not today: Mon → Fri, Thu → Fri, Sat → Sun (with a later action), moved status, moves +1', async () => {
    const mon = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a1', 'not_today');
    assert.equal(mon.status, 200);
    assert.deepEqual(mon.body.adjustment, { action_id: 'a1', from: 'Mon', to: 'Fri', reason: 'not_today' });
    const a1 = mon.body.plan.week.actions.find((a) => a.id === 'a1');
    assert.equal(a1.day, 'Fri');
    assert.equal(a1.status, 'moved');
    assert.equal(a1.moves, 1);

    const thu = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a2', 'not_today');
    assert.deepEqual(thu.body.adjustment, { action_id: 'a2', from: 'Thu', to: 'Fri', reason: 'not_today' });

    const sat = await checkin(planWith(['Mon', 'Sat', 'Sun']), 'a2', 'not_today');
    assert.deepEqual(sat.body.adjustment, { action_id: 'a2', from: 'Sat', to: 'Sun', reason: 'not_today' });
    assert.equal(sat.body.plan.week.actions.find((a) => a.id === 'a2').day, 'Sun');
  });

  test('last remaining action → NextWeek; a Sunday action → NextWeek; NextWeek counts as moved in the summary', async () => {
    const last = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a3', 'not_today');
    assert.equal(last.status, 200);
    assert.deepEqual(last.body.adjustment, { action_id: 'a3', from: 'Sat', to: NEXT_WEEK, reason: 'not_today' });
    assert.equal(last.body.plan.summary, '0/3 done · 1 moved');
    assert.match(last.body.message.text, /Moved to next week$/);

    const sun = await checkin(planWith(['Mon', 'Sat', 'Sun']), 'a3', 'not_today');
    assert.equal(sun.body.adjustment.to, NEXT_WEEK);

    // Ties: both actions on the latest day are "last".
    const tie = await checkin(planWith(['Mon', 'Sat', 'Sat']), 'a2', 'not_today');
    assert.equal(tie.body.adjustment.to, NEXT_WEEK);
  });

  test('same-day overlap is kept; repeat Not today moves again', async () => {
    const first = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a1', 'not_today');
    const second = await checkin(first.body.plan, 'a2', 'not_today');
    const days = Object.fromEntries(second.body.plan.week.actions.map((a) => [a.id, a.day]));
    assert.deepEqual(days, { a1: 'Fri', a2: 'Fri', a3: 'Sat' });
    assert.equal(second.body.plan.summary, '0/3 done · 2 moved');

    const again = await checkin(second.body.plan, 'a1', 'not_today');
    const a1 = again.body.plan.week.actions.find((a) => a.id === 'a1');
    assert.equal(a1.day, 'Sat');
    assert.equal(a1.moves, 2);
    assert.equal(a1.status, 'moved');
    assert.deepEqual(again.body.adjustment, { action_id: 'a1', from: 'Fri', to: 'Sat', reason: 'not_today' });
  });

  test('Not today message: rest-day line first, reframe, 10-minute version, move note; lint ok', async () => {
    const res = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a2', 'not_today');
    const lines = res.body.message.text.split('\n');
    assert.equal(lines[0], 'Today was a rest day, not a missed day.');
    assert.equal(lines[0], REST_DAY_LINE);
    assert.equal(lines.length, 4);
    assert.equal(lines[2], 'If you have 10 minutes: Short 2.');
    assert.equal(lines[3], 'Moved to Fri');
    assert.equal(res.body.message.ten_minute_action, 'Short 2.');
    assert.equal(lint(res.body.message.text).ok, true);
    assert.equal(res.body.share_card, null);
    // After a Done this week the reframe names the progress instead of the generic line.
    const done = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a1', 'done');
    const after = await checkin(done.body.plan, 'a2', 'not_today');
    assert.equal(after.body.message.text.split('\n')[1], '1/3 are already done this week.');
    assert.equal(lint(after.body.message.text).ok, true);
  });

  test('Done: first Done → share card (no personal data), second Done → null; summary without moved', async () => {
    const first = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a2', 'done');
    assert.equal(first.status, 200);
    assert.equal(first.body.adjustment, null);
    assert.equal(first.body.plan.summary, '1/3 done');
    assert.equal(first.body.plan.week.actions.find((a) => a.id === 'a2').status, 'done');
    const card = first.body.share_card;
    assert.ok(card);
    assert.equal(typeof card.headline, 'string');
    assert.equal(typeof card.body, 'string');
    assert.equal(card.copy_text, 'Working on: Messaging & Positioning Consultant. Just did: Action 2. 1/3 done.');
    assert.match(card.body, /1\/3 done/);
    for (const text of [card.headline, card.body, card.copy_text]) {
      assert.doesNotMatch(text, /Dana|Midwest|\d{3}-\d{4}|@/);
      assert.equal(lint(text).ok, true);
    }
    assert.ok(first.body.message);
    assert.match(first.body.message.text, /^Done: Action 2\./);
    assert.equal(lint(first.body.message.text).ok, true);

    const second = await checkin(first.body.plan, 'a1', 'done');
    assert.equal(second.status, 200);
    assert.equal(second.body.share_card, null);
    assert.equal(second.body.plan.summary, '2/3 done');
  });

  test('Done on a moved action works and carries the comeback line', async () => {
    const moved = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a2', 'not_today');
    assert.equal(moved.body.plan.pending_comeback, true);
    const done = await checkin(moved.body.plan, 'a2', 'done');
    assert.equal(done.status, 200);
    assert.equal(done.body.plan.week.actions.find((a) => a.id === 'a2').status, 'done');
    assert.equal(done.body.plan.summary, '1/3 done');
    assert.match(done.body.message.text, /Welcome back/);
    assert.equal(done.body.plan.pending_comeback, false);
  });

  test('done or NextWeek action → 409 not_checkable; path_id and action ids never change', async () => {
    const done = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a1', 'done');
    const again = await checkin(done.body.plan, 'a1', 'done');
    assert.equal(again.status, 409);
    assert.deepEqual(Object.keys(again.body), ['error']);
    assert.equal(again.body.error.code, 'not_checkable');
    assert.equal(typeof again.body.error.message, 'string');

    const notToday = await checkin(done.body.plan, 'a1', 'not_today');
    assert.equal(notToday.status, 409);

    const last = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a3', 'not_today');
    assert.equal(last.body.plan.week.actions.find((a) => a.id === 'a3').day, NEXT_WEEK);
    const nextWeek = await checkin(last.body.plan, 'a3', 'done');
    assert.equal(nextWeek.status, 409);
    assert.equal(nextWeek.body.error.code, 'not_checkable');

    assert.equal(last.body.plan.path_id, 'p1');
    assert.deepEqual(last.body.plan.week.actions.map((a) => a.id), ['a1', 'a2', 'a3']);
    assert.equal(last.body.plan.week.start, '2026-10-20');
    assert.equal(last.body.plan.north_star, 'n');
  });

  test('the spec move rule (specMoveTarget) agrees with logic.applyCheckin on every day × today combination', () => {
    for (const today of WEEK_DAYS) {
      for (const day of WEEK_DAYS) {
        for (const otherDay of ['Sun', 'Mon', day]) {
          const week = {
            actions: [
              { id: 'a1', title: 'one', short: 'one', minutes: 10, day, status: 'todo', moves: 0 },
              { id: 'a2', title: 'two', short: 'two', minutes: 10, day: otherDay, status: 'todo', moves: 0 },
            ],
            summary: '0/2 done',
            pendingComeback: false,
          };
          assert.equal(checkableActions(week).length, 2);
          const expected = specMoveTarget(week, week.actions[0], today);
          const result = applyCheckin(week, 'a1', 'not_today', today);
          assert.equal(result.ok, true);
          assert.equal(result.adjustment.toDay, expected.to, `day ${day} other ${otherDay} today ${today}`);
          assert.equal(result.adjustment.reason, expected.reason, `day ${day} other ${otherDay} today ${today}`);
          // Spec §3.4 by hand: last remaining action → NextWeek; target past Sunday → NextWeek; else the next day.
          const last = Math.max(...week.actions.map((a) => WEEK_DAYS.indexOf(a.day)));
          const target = Math.max(WEEK_DAYS.indexOf(day), WEEK_DAYS.indexOf(today)) + 1;
          if (WEEK_DAYS.indexOf(day) === last) assert.deepEqual(expected, { to: NEXT_WEEK, reason: 'last-action' });
          else if (target >= WEEK_DAYS.length) assert.deepEqual(expected, { to: NEXT_WEEK, reason: 'past-sunday' });
          else assert.deepEqual(expected, { to: WEEK_DAYS[target], reason: 'next-day' });
        }
      }
    }
  });

  test('trace statuses are ran|designed, ms null only on designed; errors for bad input', async () => {
    const ok = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a1', 'not_today');
    assertTrace(ok.body.trace);
    assert.ok(ok.body.trace.some((s) => s.layer === 'L3' && s.stage === 'checkin' && s.status === 'ran'));
    assert.ok(ok.body.trace.some((s) => s.layer === 'L4' && s.stage === 'adjust' && s.status === 'ran'));
    assert.match(ok.body.trace.find((s) => s.stage === 'adjust').output_summary, /matches the spec rule/);
    assertClean(ok.body);

    const unknown = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a9', 'done');
    assert.equal(unknown.status, 400);
    assert.equal(unknown.body.error.code, 'unknown_action');
    const badToday = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a1', 'done', 'Someday');
    assert.equal(badToday.status, 400);
    assert.equal(badToday.body.error.code, 'invalid_today');
    const badKind = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a1', 'skip');
    assert.equal(badKind.status, 400);
    assert.equal(badKind.body.error.code, 'invalid_input');
    const noPlan = await post('/v1/checkin', { path: PATH, today: 'Thu', action_id: 'a1', kind: 'done' });
    assert.equal(noPlan.status, 400);
    assert.equal(noPlan.body.error.code, 'invalid_input');
  });

  test('ISO today is accepted (2026-10-22 is a Thursday)', async () => {
    const res = await checkin(planWith(['Mon', 'Thu', 'Sat']), 'a2', 'not_today', '2026-10-22');
    assert.equal(res.status, 200);
    assert.equal(res.body.adjustment.to, 'Fri');
  });
});

describe('POST /v1/voice/token and transport behaviour', () => {
  test('voice token → 501 voice_not_enabled', async () => {
    const res = await post('/v1/voice/token', {});
    assert.equal(res.status, 501);
    assert.deepEqual(res.body, { error: { code: 'voice_not_enabled', message: 'Voice input is not enabled for this event build.' } });
  });

  test('invalid JSON → 400 invalid_json; array body → 400 invalid_input; GET → 405', async () => {
    const bad = await post('/v1/interview', '{ nope');
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, 'invalid_json');
    const arr = await post('/v1/paths', [1, 2]);
    assert.equal(arr.status, 400);
    assert.equal(arr.body.error.code, 'invalid_input');
    for (const path of COMPAT_ROUTES) {
      const res = await fetch(`${url}${path}`);
      assert.equal(res.status, 405, path);
      assert.equal(res.headers.get('allow'), 'POST, OPTIONS');
    }
  });

  test('CORS, body limit and bearer token apply to the compat routes exactly as to the tool routes', async () => {
    const cors = await post('/v1/interview', { ...base, user_turn: null }, { Origin: 'https://demo.example' });
    assert.equal(cors.headers.get('access-control-allow-origin'), 'https://demo.example');
    const preflight = await fetch(`${url}/v1/checkin`, { method: 'OPTIONS', headers: { Origin: 'https://demo.example', 'Access-Control-Request-Method': 'POST' } });
    assert.equal(preflight.status, 204);

    const big = await post('/v1/paths', { ...base, history: [{ role: 'user', text: 'x'.repeat(70 * 1024) }] });
    assert.equal(big.status, 413);
    assert.equal(big.body.error.code, 'payload_too_large');

    const noToken = await fetch(`${tokenServer.url}/v1/interview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(noToken.status, 401);
    const withToken = await fetch(`${tokenServer.url}/v1/voice/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer demo-secret' },
      body: '{}',
    });
    assert.equal(withToken.status, 501);
  });

  test('existing routes are untouched: health, think, scenario, 404', async () => {
    const health = await fetch(`${url}/v1/health`);
    assert.equal(health.status, 200);
    const think = await post('/v1/think', { today: 'Thu' });
    assert.equal(think.status, 200);
    assert.ok(think.body.intervention);
    const scenario = await fetch(`${url}/v1/scenario`);
    assert.equal((await scenario.json())._label, 'synthetic');
    const nope = await fetch(`${url}/v1/nope`, { method: 'POST' });
    assert.equal(nope.status, 404);
  });
});
