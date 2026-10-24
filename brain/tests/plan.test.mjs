// plan.test.mjs — if-then lines and plan fields on a week (ALGORITHM_DESIGN §3.3, §4.1).
// Run from brain/: node --test tests/plan.test.mjs   All fixtures are inline and synthetic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as plan from '../plan.js';

const { withIfThen, describePlanLine, ifThenLine, MILESTONES, DEFAULT_MILESTONE, NEXT_WEEK } = plan;

const BANNED = ['fail', 'failed', 'missed', 'broke', 'broken', 'streak', 'behind', 'lazy', 'should', 'must', 'excuse', 'just'];
const hasBanned = (text) => BANNED.filter((word) => new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, 'i').test(text));

// A week as Build's buildWeek returns it (three actions on Tue/Thu/Sat, all todo).
function sampleWeek() {
  return {
    actions: [
      { id: 'a1', title: 'Write a before/after page', minutes: 25, day: 'Tue', status: 'todo', moves: 0, short: 'Write only the headline' },
      { id: 'a2', title: 'Draft a pilot offer email', minutes: 20, day: 'Thu', status: 'done', moves: 0, short: 'Write only the subject line' },
      { id: 'a3', title: 'List the 7 questions you ask in a discovery call', minutes: 20, day: 'Sat', status: 'moved', moves: 1, short: 'Write the first 3 questions' },
    ],
    summary: '1/3 done · 1 moved',
    pathId: 'messaging-consultant',
    pathTitle: 'Messaging & Positioning Consultant',
    today: 'Tue',
    pendingComeback: false,
  };
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

describe('withIfThen: the if-then line', () => {
  test('without an anchor the line names only the day (no anchor is guessed)', () => {
    const out = withIfThen(sampleWeek());
    assert.equal(out.actions[0].ifThen, 'On Tue, I will Write a before/after page');
    assert.equal(out.actions[1].ifThen, 'On Thu, I will Draft a pilot offer email');
    assert.equal(out.actions[2].ifThen, 'On Sat, I will List the 7 questions you ask in a discovery call');
  });

  test('with an anchor the line says "after <anchor>"', () => {
    const out = withIfThen(sampleWeek(), { anchor: 'morning coffee' });
    assert.equal(out.actions[0].ifThen, 'On Tue after morning coffee, I will Write a before/after page');
    assert.equal(out.actions[1].ifThen, 'On Thu after morning coffee, I will Draft a pilot offer email');
  });

  test('anchor text is trimmed and a leading "after" is not doubled; blank or non-string anchors count as none', () => {
    assert.equal(withIfThen(sampleWeek(), { anchor: '  after lunch  ' }).actions[0].ifThen, 'On Tue after lunch, I will Write a before/after page');
    assert.equal(withIfThen(sampleWeek(), { anchor: '   ' }).actions[0].ifThen, 'On Tue, I will Write a before/after page');
    assert.equal(withIfThen(sampleWeek(), { anchor: null }).actions[0].ifThen, 'On Tue, I will Write a before/after page');
    assert.equal(withIfThen(sampleWeek(), { anchor: 42 }).actions[0].ifThen, 'On Tue, I will Write a before/after page');
    assert.equal(withIfThen(sampleWeek(), { anchor: { cue: 'coffee' } }).actions[0].ifThen, 'On Tue, I will Write a before/after page');
  });

  test('NextWeek day -> "Next week, I will …" (with and without anchor)', () => {
    const week = { actions: [{ id: 'a3', title: 'List the 7 questions', minutes: 20, day: NEXT_WEEK, status: 'moved', moves: 1 }] };
    assert.equal(withIfThen(week).actions[0].ifThen, 'Next week, I will List the 7 questions');
    assert.equal(withIfThen(week, { anchor: 'morning coffee' }).actions[0].ifThen, 'Next week after morning coffee, I will List the 7 questions');
  });

  test('unknown or missing day -> "This week, I will …" (no day is guessed)', () => {
    assert.equal(withIfThen({ actions: [{ id: 'a1', title: 'Write a page', day: 'Someday' }] }).actions[0].ifThen, 'This week, I will Write a page');
    assert.equal(withIfThen({ actions: [{ id: 'a1', title: 'Write a page' }] }).actions[0].ifThen, 'This week, I will Write a page');
  });

  test('title whitespace is collapsed; an action without a title gets ifThen null', () => {
    assert.equal(withIfThen({ actions: [{ id: 'a1', title: '  Write   a page ', day: 'Wed' }] }).actions[0].ifThen, 'On Wed, I will Write a page');
    assert.equal(withIfThen({ actions: [{ id: 'a1', title: '', day: 'Wed' }] }).actions[0].ifThen, null);
    assert.equal(withIfThen({ actions: [{ id: 'a1', day: 'Wed' }] }).actions[0].ifThen, null);
  });

  test('an if_then written by the LLM is replaced by the deterministic line', () => {
    const week = { actions: [{ id: 'a1', title: 'Write a page', day: 'Fri', if_then: 'After my 7am run, I will write a page', ifThen: 'stale' }] };
    assert.equal(withIfThen(week).actions[0].ifThen, 'On Fri, I will Write a page');
  });

  test('every action carries an if-then with its day; no banned words', () => {
    const out = withIfThen(sampleWeek(), { anchor: 'morning coffee' });
    assert.equal(out.actions.length, 3);
    for (const action of out.actions) {
      assert.equal(typeof action.ifThen, 'string');
      assert.ok(action.ifThen.includes(`On ${action.day}`), `${action.id} names its day`);
      assert.deepEqual(hasBanned(action.ifThen), []);
      assert.deepEqual(hasBanned(describePlanLine(action)), []);
    }
  });
});

describe('withIfThen: plan fields and immutability', () => {
  test('milestone M1, evidenceProduced null, constraintTargeted null, dependsOnPerson false by default', () => {
    assert.deepEqual(MILESTONES, ['M1', 'M2', 'M3', 'M4']);
    assert.equal(DEFAULT_MILESTONE, 'M1');
    for (const action of withIfThen(sampleWeek()).actions) {
      assert.equal(action.milestone, 'M1');
      assert.equal(action.evidenceProduced, null);
      assert.equal(action.constraintTargeted, null);
      assert.equal(action.dependsOnPerson, false);
    }
  });

  test('keeps id, status, minutes, day, moves and short exactly', () => {
    const out = withIfThen(sampleWeek(), { anchor: 'morning coffee', milestone: 'M2' });
    const before = sampleWeek().actions;
    out.actions.forEach((action, i) => {
      for (const key of ['id', 'title', 'status', 'minutes', 'day', 'moves', 'short']) assert.equal(action[key], before[i][key], `${action.id}.${key}`);
    });
  });

  test('milestone option applies to every action; an invalid option falls back to M1; a valid action-level value wins', () => {
    assert.ok(withIfThen(sampleWeek(), { milestone: 'M3' }).actions.every((a) => a.milestone === 'M3'));
    assert.ok(withIfThen(sampleWeek(), { milestone: 'M9' }).actions.every((a) => a.milestone === 'M1'));
    assert.ok(withIfThen(sampleWeek(), { milestone: 2 }).actions.every((a) => a.milestone === 'M1'));
    const week = { actions: [{ id: 'a1', title: 'Write a page', day: 'Tue', milestone: 'M4' }, { id: 'a2', title: 'Send it', day: 'Thu', milestone: 'bogus' }] };
    const out = withIfThen(week, { milestone: 'M2' });
    assert.equal(out.actions[0].milestone, 'M4');
    assert.equal(out.actions[1].milestone, 'M2');
  });

  test('evidenceProduced / constraintTargeted / dependsOnPerson pass through when provided (camelCase or snake_case), never invented', () => {
    const week = {
      actions: [
        { id: 'a1', title: 'Write a page', day: 'Tue', evidence_produced: 'one-page before/after story', constraint_targeted: 'CAP_psych', depends_on_person: true },
        { id: 'a2', title: 'Send it', day: 'Thu', evidenceProduced: 'pilot offer email draft', dependsOnPerson: false },
        { id: 'a3', title: 'List questions', day: 'Sat' },
      ],
    };
    const out = withIfThen(week, { constraintTargeted: 'OPP_social' });
    assert.equal(out.actions[0].evidenceProduced, 'one-page before/after story');
    assert.equal(out.actions[0].constraintTargeted, 'CAP_psych');
    assert.equal(out.actions[0].dependsOnPerson, true);
    assert.equal(out.actions[1].evidenceProduced, 'pilot offer email draft');
    assert.equal(out.actions[1].constraintTargeted, 'OPP_social');
    assert.equal(out.actions[1].dependsOnPerson, false);
    assert.equal(out.actions[2].evidenceProduced, null);
    assert.equal(out.actions[2].constraintTargeted, 'OPP_social');
    assert.equal(out.actions[2].dependsOnPerson, false);
    assert.equal(withIfThen(week, { evidenceProduced: 'x' }).actions[2].evidenceProduced, 'x');
    assert.equal(withIfThen(week, { dependsOnPerson: true }).actions[2].dependsOnPerson, false, 'dependsOnPerson is per action, never set from options');
  });

  test('never mutates the input week (deep-frozen input, new objects out, week-level fields kept)', () => {
    const input = deepFreeze(sampleWeek());
    const snapshot = JSON.stringify(input);
    const out = withIfThen(input, { anchor: 'morning coffee', milestone: 'M2' });
    assert.equal(JSON.stringify(input), snapshot);
    assert.notEqual(out, input);
    assert.notEqual(out.actions, input.actions);
    out.actions.forEach((action, i) => assert.notEqual(action, input.actions[i]));
    assert.equal(out.summary, input.summary);
    assert.equal(out.pathId, input.pathId);
    assert.equal(out.pathTitle, input.pathTitle);
    assert.equal(out.today, input.today);
    assert.equal(out.pendingComeback, input.pendingComeback);
    assert.equal(input.actions[0].ifThen, undefined);
  });

  test('is deterministic and idempotent', () => {
    const once = withIfThen(sampleWeek(), { anchor: 'morning coffee' });
    const twice = withIfThen(once, { anchor: 'morning coffee' });
    assert.deepEqual(twice, once);
    assert.deepEqual(withIfThen(sampleWeek(), { anchor: 'morning coffee' }), once);
  });

  test('empty actions, missing actions, non-array actions and a missing week all give actions: []', () => {
    assert.deepEqual(withIfThen({ actions: [] }), { actions: [] });
    assert.deepEqual(withIfThen({ actions: [] }, { anchor: 'morning coffee' }), { actions: [] });
    assert.deepEqual(withIfThen({ pathId: 'p1' }), { pathId: 'p1', actions: [] });
    assert.deepEqual(withIfThen({ actions: 'nope' }), { actions: [] });
    assert.deepEqual(withIfThen(undefined), { actions: [] });
    assert.deepEqual(withIfThen(null, { anchor: 'x' }), { actions: [] });
    assert.deepEqual(withIfThen([]), { actions: [] });
  });

  test('a non-object action becomes a plan action with ifThen null', () => {
    const out = withIfThen({ actions: [null, 'text', 7] });
    assert.equal(out.actions.length, 3);
    for (const action of out.actions) {
      assert.equal(action.ifThen, null);
      assert.equal(action.milestone, 'M1');
      assert.equal(action.dependsOnPerson, false);
    }
  });
});

describe('describePlanLine', () => {
  test('if-then · minutes · milestone, exact', () => {
    const [a1] = withIfThen(sampleWeek()).actions;
    assert.equal(describePlanLine(a1), 'On Tue, I will Write a before/after page · 25 min · M1');
    const [b1] = withIfThen(sampleWeek(), { anchor: 'morning coffee', milestone: 'M2' }).actions;
    assert.equal(describePlanLine(b1), 'On Tue after morning coffee, I will Write a before/after page · 25 min · M2');
  });

  test('works on a raw action that never went through withIfThen; missing parts are left out', () => {
    assert.equal(describePlanLine({ title: 'Write a page', day: 'Wed', minutes: 15 }), 'On Wed, I will Write a page · 15 min');
    assert.equal(describePlanLine({ title: 'Write a page', day: NEXT_WEEK }), 'Next week, I will Write a page');
    assert.equal(describePlanLine({ title: 'Write a page', day: 'Wed', minutes: 0, milestone: 'M3' }), 'On Wed, I will Write a page · M3');
    assert.equal(describePlanLine({ title: 'Write a page', day: 'Wed', minutes: 'soon', milestone: 'M9' }), 'On Wed, I will Write a page');
  });

  test('no title, garbage or nothing -> empty string', () => {
    assert.equal(describePlanLine({ day: 'Wed', minutes: 15 }), '');
    assert.equal(describePlanLine({ ifThen: null, title: '   ' }), '');
    assert.equal(describePlanLine(null), '');
    assert.equal(describePlanLine(), '');
    assert.equal(describePlanLine('text'), '');
  });
});

describe('ifThenLine', () => {
  test('exact strings for day, NextWeek and anchor; null without a title', () => {
    assert.equal(ifThenLine({ title: 'Write a page', day: 'Mon' }), 'On Mon, I will Write a page');
    assert.equal(ifThenLine({ title: 'Write a page', day: 'Mon' }, 'breakfast'), 'On Mon after breakfast, I will Write a page');
    assert.equal(ifThenLine({ title: 'Write a page', day: NEXT_WEEK }, 'breakfast'), 'Next week after breakfast, I will Write a page');
    assert.equal(ifThenLine({ title: '' , day: 'Mon' }, 'breakfast'), null);
    assert.equal(ifThenLine(null), null);
  });
});
