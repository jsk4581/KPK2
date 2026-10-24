// goal.test.mjs — goal state, the four gates with dates, the one next question, gate rules.
// Run from brain/: node --test tests/   All fixtures are inline and synthetic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as goal from '../goal.js';

const { goalState, milestones, nextQuestion, gatePassed, evaluateGate, addDays, GATE_TEMPLATES, QUESTION_TABLE, GOAL_STATES } = goal;

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
  });
});
