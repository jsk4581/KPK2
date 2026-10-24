// goal.test.mjs — goal state, the four gates with dates, the one next question, gate rules.
// Run from brain/: node --test tests/   All fixtures are inline and synthetic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as goal from '../goal.js';

const { goalState, milestones, nextQuestion, gatePassed, evaluateGate, addDays, goalHistory, GATE_TEMPLATES, QUESTION_TABLE, GOAL_STATES } = goal;

const BANNED = ['fail', 'failed', 'missed', 'broke', 'broken', 'streak', 'behind', 'lazy', 'should', 'must', 'excuse', 'just'];
const hasBanned = (text) => BANNED.filter((word) => new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, 'i').test(text));

const PATH_DRAFT = {
  role_id: 'messaging-consultant',
  title: 'Messaging & Positioning Consultant',
  week: { actions: [{ title: 'Write a before/after page', minutes: 25, day: 'Tue', short: 'Write only the headline' }] },
};
const RANKED_ROLE = { id: 'copy-educator', title: 'Copy Educator / Workshop Lead', ratio: 0.6, transfers: ['workshop-facilitation'], missing: ['curriculum-design'] };

describe('goalState', () => {
  test('three states in order', () => {
    assert.deepEqual(GOAL_STATES, ['ambiguous', 'provisional', 'validated']);
  });

  test('no path -> ambiguous (check-ins do not change that)', () => {
    assert.equal(goalState({}), 'ambiguous');
    assert.equal(goalState(), 'ambiguous');
    assert.equal(goalState({ chosenPathId: '', checkins: [{ actionId: 'a1', kind: 'done', day: 'Thu' }] }), 'ambiguous');
  });

  test('path chosen -> provisional; first gate passed -> validated', () => {
    const gates = milestones(PATH_DRAFT, '2026-10-05');
    assert.equal(goalState({ chosenPathId: 'messaging-consultant', checkins: [], gates }), 'provisional');
    const passed = gates.map((gate, i) => (i === 0 ? { ...gate, passed: true } : gate));
    assert.equal(goalState({ chosenPathId: 'messaging-consultant', checkins: [], gates: passed }), 'validated');
  });

  test('a gate is only "passed" when passed === true', () => {
    const gates = [{ id: 'M1', passed: 'yes' }, { id: 'M2', passed: 1 }, null];
    assert.equal(goalState({ chosenPathId: 'p1', gates }), 'provisional');
  });

  test('later gate not passed -> back to provisional (validated is re-checked at every due gate)', () => {
    const gates = milestones(PATH_DRAFT, '2026-10-05'); // M1 2026-10-19, M2 2026-11-16, M3 2026-12-07, M4 2026-12-28
    const m1Only = gates.map((gate) => ({ ...gate, passed: gate.id === 'M1' }));
    // M2 is due (today is on or after its date) and not passed while M1 passed -> re-check.
    assert.equal(goalState({ chosenPathId: 'p1', gates: m1Only, today: '2026-11-16' }), 'provisional');
    assert.equal(goalState({ chosenPathId: 'p1', gates: m1Only, today: '2026-12-10' }), 'provisional');
    // The day before M2 is due, M1 passed still counts as validated-for-now.
    assert.equal(goalState({ chosenPathId: 'p1', gates: m1Only, today: '2026-11-15' }), 'validated');
    // Passing the due gate restores validated; a later gate that is not yet due does not demote.
    const m1m2 = gates.map((gate) => ({ ...gate, passed: gate.id === 'M1' || gate.id === 'M2' }));
    assert.equal(goalState({ chosenPathId: 'p1', gates: m1m2, today: '2026-11-20' }), 'validated');
    assert.equal(goalState({ chosenPathId: 'p1', gates: m1m2, today: '2026-12-07' }), 'provisional');
    // An explicit due flag works without dates or a today.
    assert.equal(goalState({ chosenPathId: 'p1', gates: [{ id: 'M1', passed: true }, { id: 'M2', passed: false, due: true }] }), 'provisional');
  });

  test('without a today (or due flags) nothing is known to be due: any passed gate -> validated', () => {
    const gates = milestones(PATH_DRAFT, '2026-10-05').map((gate) => ({ ...gate, passed: gate.id === 'M1' }));
    assert.equal(goalState({ chosenPathId: 'p1', gates }), 'validated');
    assert.equal(goalState({ chosenPathId: 'p1', gates, today: 'Thursday' }), 'validated');
    // Due gate not passed and no earlier gate passed -> provisional (never validated by itself).
    const none = gates.map((gate) => ({ ...gate, passed: false }));
    assert.equal(goalState({ chosenPathId: 'p1', gates: none, today: '2026-12-30' }), 'provisional');
  });
});

describe('goalHistory (goal_version)', () => {
  const event = (at, from, to, reason, extra = {}) => ({ at, from, to, reason, ...extra });

  test('history append is pure and ordered', () => {
    const v0 = goalHistory(undefined, undefined);
    assert.deepEqual(v0, { version: 0, history: [], not_now: [] });
    const v1 = goalHistory(v0, event('2026-10-05', 'ambiguous', 'provisional', 'path chosen'));
    const v2 = goalHistory(v1, event('2026-10-19', 'provisional', 'validated', 'M1 continue', { gateId: 'M1', decision: 'continue' }));
    assert.equal(v1.version, 1);
    assert.equal(v2.version, 2);
    assert.deepEqual(v2.history, [
      { at: '2026-10-05', from: 'ambiguous', to: 'provisional', reason: 'path chosen' },
      { at: '2026-10-19', from: 'provisional', to: 'validated', reason: 'M1 continue', gateId: 'M1', decision: 'continue' },
    ]);
    // Pure: earlier versions are untouched and the returned arrays are fresh copies.
    assert.deepEqual(v0, { version: 0, history: [], not_now: [] });
    assert.equal(v1.history.length, 1);
    assert.notEqual(v1.history, v2.history);
    assert.notEqual(v1.history[0], v2.history[0]);
    const frozen = Object.freeze({ version: 1, history: Object.freeze([Object.freeze(v1.history[0])]), not_now: Object.freeze([]) });
    assert.doesNotThrow(() => goalHistory(frozen, event('2026-11-16', 'validated', 'provisional', 'M2 reframe')));
  });

  test('a gate that is not passed is a decision with a reason, never a failure', () => {
    const v = goalHistory([], event('2026-11-16', 'validated', 'provisional', 'portfolio pieces not reworked yet', { gateId: 'M2', decision: 'reframe-scope' }));
    assert.equal(v.history[0].decision, 'reframe-scope');
    assert.deepEqual(hasBanned(`${v.history[0].reason} ${v.history[0].decision}`), []);
  });

  test('not_now is passed through and extended, deduplicated, in order', () => {
    const v1 = goalHistory({ not_now: ['newsletter'] }, event('2026-10-05', 'ambiguous', 'provisional', 'path chosen', { not_now: ['podcast', 'newsletter'] }));
    assert.deepEqual(v1.not_now, ['newsletter', 'podcast']);
    const v2 = goalHistory(v1, {});
    assert.deepEqual(v2, { version: 1, history: v1.history, not_now: ['newsletter', 'podcast'] });
    assert.deepEqual(goalHistory({ notNow: ['a'] }, { notNow: ['', null, 'b'] }).not_now, ['a', 'b']);
  });

  test('missing fields are null, an empty event only copies, deterministic', () => {
    const v = goalHistory(null, { to: 'provisional' });
    assert.deepEqual(v.history, [{ at: null, from: null, to: 'provisional', reason: null }]);
    assert.deepEqual(goalHistory(v, {}), v);
    assert.deepEqual(goalHistory(v, null), v);
    const prev = { version: 1, history: [{ at: '2026-10-05', from: 'ambiguous', to: 'provisional', reason: 'r' }, null, 'x'], not_now: [] };
    assert.deepEqual(goalHistory(prev, event('2026-10-19', 'provisional', 'validated', 'ok')), goalHistory(prev, event('2026-10-19', 'provisional', 'validated', 'ok')));
    assert.equal(goalHistory(prev, event('2026-10-19', 'provisional', 'validated', 'ok')).version, 2);
  });
});

describe('milestones', () => {
  test('exactly four gates: Fit wk2, Proof wk6, Market wk9, Ready wk12', () => {
    const gates = milestones(PATH_DRAFT, '2026-10-05');
    assert.equal(gates.length, 4);
    assert.deepEqual(gates.map((g) => [g.id, g.name, g.week]), [['M1', 'Fit', 2], ['M2', 'Proof', 6], ['M3', 'Market', 9], ['M4', 'Ready', 12]]);
    for (const gate of gates) {
      for (const key of ['outcome', 'evidence', 'problemGate']) assert.ok(typeof gate[key] === 'string' && gate[key].length > 0, `${gate.id}.${key}`);
      assert.ok(Array.isArray(gate.decision) && gate.decision.length === 2, `${gate.id}.decision has two options`);
      assert.equal(gate.passed, false);
      assert.deepEqual(hasBanned(`${gate.outcome} ${gate.evidence} ${gate.problemGate}`), []);
    }
  });

  test('dates are ISO arithmetic from startDate (start + week * 7 days)', () => {
    const gates = milestones(PATH_DRAFT, '2026-10-05');
    assert.deepEqual(gates.map((g) => g.date), ['2026-10-19', '2026-11-16', '2026-12-07', '2026-12-28']);
    // Year boundary.
    assert.deepEqual(milestones(PATH_DRAFT, '2026-12-01').map((g) => g.date), ['2026-12-15', '2027-01-12', '2027-02-02', '2027-02-23']);
    assert.equal(addDays('2026-02-27', 2), '2026-03-01');
  });

  test('no or invalid startDate -> dates null, gates still four', () => {
    for (const start of [undefined, null, '', 'Thursday', '2026-1-5', 20261005]) {
      const gates = milestones(PATH_DRAFT, start);
      assert.equal(gates.length, 4);
      assert.deepEqual(gates.map((g) => g.date), [null, null, null, null]);
    }
  });

  test('takes a path draft (role_id/title) or a rankRoles entry (id/title)', () => {
    assert.equal(milestones(PATH_DRAFT, '2026-10-05')[0].pathId, 'messaging-consultant');
    assert.equal(milestones(PATH_DRAFT, '2026-10-05')[0].pathTitle, 'Messaging & Positioning Consultant');
    assert.equal(milestones(RANKED_ROLE, '2026-10-05')[3].pathId, 'copy-educator');
    assert.equal(milestones(RANKED_ROLE, '2026-10-05')[3].pathTitle, 'Copy Educator / Workshop Lead');
    assert.equal(milestones(null, '2026-10-05').length, 4);
  });

  test('returned gates are copies: editing one does not change the template', () => {
    const gates = milestones(PATH_DRAFT, '2026-10-05');
    gates[0].decision.push('x');
    gates[0].passed = true;
    assert.equal(GATE_TEMPLATES[0].decision.length, 2);
    assert.equal(milestones(PATH_DRAFT, '2026-10-05')[0].passed, false);
  });
});

describe('nextQuestion (information-gain table)', () => {
  const person = (archetype) => ({ traits: { archetype, stageOfChange: 'contemplation' } });

  test('ambiguous -> future-state question', () => {
    const q = nextQuestion({ person: person('identity-grief'), goalState: 'ambiguous' });
    assert.equal(q.key, 'future-state');
    assert.match(q.question, /Twelve weeks from now/);
    assert.ok(q.why.length > 0);
  });

  test('ambiguous + tool-curious -> ask what change the tool makes', () => {
    const q = nextQuestion({ person: person('tool-curious'), goalState: 'ambiguous' });
    assert.equal(q.key, 'tool-to-change');
  });

  test('provisional + unknown constraint -> what blocked you most this week', () => {
    for (const constraint of [undefined, null, '', 'unknown', { kind: 'unknown' }, {}]) {
      const q = nextQuestion({ person: person('unknown'), goalState: 'provisional', constraint });
      assert.equal(q.key, 'blocker-this-week');
      assert.match(q.question, /What blocked you most this week/);
    }
  });

  test('provisional + known constraint -> the M1 fit conversation', () => {
    for (const constraint of ['opportunity-time', { kind: 'capability' }, { type: 'motivation-reflective' }]) {
      assert.equal(nextQuestion({ person: person('unknown'), goalState: 'provisional', constraint }).key, 'fit-conversation');
    }
  });

  test('validated -> market check', () => {
    const q = nextQuestion({ person: person('pivot-with-runway'), goalState: 'validated', constraint: 'opportunity-time' });
    assert.equal(q.key, 'market-check');
    assert.match(q.question, /money or time/);
  });

  test('always exactly one question, no banned words, works without a person', () => {
    for (const state of ['ambiguous', 'provisional', 'validated', undefined, 'garbage']) {
      const q = nextQuestion({ goalState: state });
      assert.equal(typeof q.question, 'string');
      assert.equal((q.question.match(/\?/g) || []).length, 1, `one question mark: ${q.question}`);
      assert.deepEqual(hasBanned(`${q.question} ${q.why}`), []);
    }
    assert.equal(nextQuestion().key, 'future-state');
    for (const entry of Object.values(QUESTION_TABLE)) assert.deepEqual(hasBanned(`${entry.question} ${entry.why}`), []);
  });
});

describe('gatePassed / evaluateGate', () => {
  const M1 = milestones(PATH_DRAFT, '2026-10-05')[0];
  const done = (actionId, day, week) => ({ actionId, kind: 'done', day, ...(week === undefined ? {} : { week }) });
  const notToday = (actionId, day) => ({ actionId, kind: 'not_today', day });

  test('M1 Fit: two Done in the first two weeks AND the user confirm flag', () => {
    const checkins = [done('a1', 'Tue', 1), notToday('a2', 'Thu'), done('a2', 'Fri', 1)];
    assert.equal(gatePassed(M1, { checkins, confirmed: true }), true);
    assert.equal(gatePassed(M1, { checkins, confirmed: false }), false);
    assert.equal(gatePassed(M1, { checkins }), false);
    assert.equal(gatePassed(M1, { checkins: [done('a1', 'Tue', 1)], confirmed: true }), false);
  });

  test('a missing check is a reason, never a pass', () => {
    const result = evaluateGate(M1, { checkins: [done('a1', 'Tue')] });
    assert.equal(result.passed, false);
    assert.deepEqual(result.reasons, ['done_below_minimum', 'not_confirmed']);
    assert.equal(result.done, 1);
    assert.equal(result.required, 2);
    assert.equal(evaluateGate(M1, {}).passed, false);
    assert.equal(evaluateGate(undefined, undefined).passed, false);
    assert.equal(gatePassed(M1, { confirmed: true }), false); // confirm alone is not evidence
  });

  test('Done after the gate week does not count toward it', () => {
    const late = [done('a1', 'Tue', 3), done('a2', 'Thu', 4)];
    assert.equal(evaluateGate(M1, { checkins: late, confirmed: true }).done, 0);
    const mixed = [done('a1', 'Tue', 1), done('a2', 'Thu', 2), done('a3', 'Sat', 5)];
    assert.equal(evaluateGate(M1, { checkins: mixed, confirmed: true }).done, 2);
    assert.equal(gatePassed(M1, { checkins: mixed, confirmed: true }), true);
  });

  test('date-only check-ins after the gate week do not count', () => {
    // M1 week 2, date 2026-10-19 -> arcStart 2026-10-05; week 2 = 2026-10-12 .. 2026-10-18.
    const dated = (actionId, date) => ({ actionId, kind: 'done', day: 'Mon', date });
    const inWeek = [dated('a1', '2026-10-05'), dated('a2', '2026-10-18')];
    assert.equal(evaluateGate(M1, { checkins: inWeek, confirmed: true }).done, 2);
    assert.equal(gatePassed(M1, { checkins: inWeek, confirmed: true }), true);
    const late = [dated('a1', '2026-10-19'), dated('a2', '2026-10-26')];
    assert.equal(evaluateGate(M1, { checkins: late, confirmed: true }).done, 0);
    assert.equal(gatePassed(M1, { checkins: late, confirmed: true }), false);
    const mixed = [dated('a1', '2026-10-06'), dated('a2', '2026-10-20'), dated('a3', '2026-10-13')];
    assert.equal(evaluateGate(M1, { checkins: mixed, confirmed: true }).done, 2);
    // An explicit week wins over the date; a non-ISO date (or no gate date and no arcStart) is the MVP's single week.
    assert.equal(evaluateGate(M1, { checkins: [{ ...dated('a1', '2026-10-26'), week: 1 }], confirmed: true }).done, 1);
    assert.equal(evaluateGate(M1, { checkins: [dated('a1', 'Monday')], confirmed: true }).done, 1);
    assert.equal(evaluateGate({ id: 'M1' }, { checkins: late, confirmed: true }).done, 2);
    // A gate without a date uses context.arcStart.
    assert.equal(evaluateGate({ id: 'M1' }, { checkins: late, arcStart: '2026-10-05', confirmed: true }).done, 0);
    // Later gates count the same dated check-ins up to their own week (M2 = week 6).
    const M2 = milestones(PATH_DRAFT, '2026-10-05')[1];
    assert.equal(evaluateGate(M2, { checkins: late, confirmed: true }).done, 2);
    assert.equal(evaluateGate(M2, { checkins: [dated('a1', '2026-11-16')], confirmed: true }).done, 0);
  });

  test('without check-ins the week state is the evidence', () => {
    const week = { actions: [{ id: 'a1', status: 'done' }, { id: 'a2', status: 'done' }, { id: 'a3', status: 'todo' }] };
    assert.equal(gatePassed(M1, { week, confirmed: true }), true);
    assert.equal(gatePassed(M1, { week: { actions: [{ id: 'a1', status: 'done' }] }, confirmed: true }), false);
  });

  test('later gates need more evidence and the same confirm', () => {
    const [, M2, M3, M4] = milestones(PATH_DRAFT, '2026-10-05');
    const many = Array.from({ length: 12 }, (_, i) => done(`a${(i % 3) + 1}`, 'Mon', Math.floor(i / 3) + 1));
    assert.deepEqual([M2, M3, M4].map((g) => evaluateGate(g, { checkins: many, confirmed: true }).required), [6, 9, 12]);
    assert.equal(gatePassed(M4, { checkins: many, confirmed: true }), true);
    assert.equal(gatePassed(M4, { checkins: many.slice(0, 11), confirmed: true }), false);
    assert.equal(gatePassed(M2, { checkins: many, confirmed: false }), false);
  });

  test('deterministic', () => {
    const ctx = { checkins: [done('a1', 'Tue'), done('a2', 'Thu')], confirmed: true };
    assert.deepEqual(evaluateGate(M1, ctx), evaluateGate(M1, ctx));
    const dated = { checkins: [{ actionId: 'a1', kind: 'done', day: 'Mon', date: '2026-10-12' }], confirmed: true };
    assert.deepEqual(evaluateGate(M1, dated), evaluateGate(M1, dated));
    assert.deepEqual(Object.keys(evaluateGate(M1, dated)), ['passed', 'gateId', 'done', 'required', 'confirmed', 'reasons']);
  });

  test('GATE_TEMPLATES are unchanged', () => {
    assert.deepEqual(GATE_TEMPLATES.map((g) => [g.id, g.name, g.week, g.minDone]), [['M1', 'Fit', 2, 2], ['M2', 'Proof', 6, 6], ['M3', 'Market', 9, 9], ['M4', 'Ready', 12, 12]]);
    assert.deepEqual(GATE_TEMPLATES.map((g) => g.decision), [['continue', 'change-path'], ['continue', 'reframe-scope'], ['continue', 'change-route'], ['apply', 'extend']]);
  });
});
