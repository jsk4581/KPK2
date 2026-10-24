// monitor.test.mjs — plan versus reality: drift, plateau, resize cap, replan question, escalation.
// Run from brain/: node --test tests/   Weeks are built with Build's logic.js so the shapes match the
// screen. All fixtures are inline and synthetic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as monitor from '../monitor.js';
import { lint } from '../messages.js';
import { buildWeek, applyCheckin } from '../../app/logic.js';

const { compareWeek, weeklyReview, resizePlan, detectEscalation, lifelogGapDays, CRISIS_PHRASES, ECONOMIC_PHRASES, REPLAN_QUESTION, RESIZE_UP_CAP_PCT, DRIFT_TYPES } = monitor;

const BANNED = ['fail', 'failed', 'missed', 'broke', 'broken', 'streak', 'behind', 'lazy', 'should', 'must', 'excuse', 'just'];
const hasBanned = (text) => BANNED.filter((word) => new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, 'i').test(text));
const allStrings = (value, out = []) => {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allStrings(v, out));
  return out;
};

// Synthetic path draft in the fallback shape (docs/logic-contract.md buildWeek).
const PATH = {
  role_id: 'messaging-consultant',
  title: 'Messaging & Positioning Consultant',
  week: {
    actions: [
      { title: 'Write a before/after page', minutes: 25, day: 'Tue', short: 'Write only the headline' },
      { title: 'Draft a pilot offer email', minutes: 30, day: 'Thu', short: 'Write only the subject line' },
      { title: 'List seven discovery questions', minutes: 20, day: 'Sat', short: 'Write two questions' },
    ],
  },
};
const LIFELOG = [
  { id: 'l1', date: '2026-10-20', source: 'note', title: 'Note', summary: 'A note.', tags: [], url: null, _label: 'synthetic' },
  { id: 'l2', date: '2026-10-22', source: 'calendar', title: 'Call', summary: 'A call.', tags: [], url: null, _label: 'synthetic' },
];

const freshWeek = () => buildWeek(PATH, 'Thu');
const done = (actionId, day) => ({ actionId, kind: 'done', day });
const notToday = (actionId, day) => ({ actionId, kind: 'not_today', day });

// a1 (Tue) moved twice: Thu -> Fri, then Fri -> Sat. Build's applyCheckin does the moving.
function twiceMoved() {
  let week = freshWeek();
  const first = applyCheckin(week, 'a1', 'not_today', 'Thu');
  assert.equal(first.ok, true);
  const second = applyCheckin(first.week, 'a1', 'not_today', 'Fri');
  assert.equal(second.ok, true);
  week = second.week;
  const checkins = [notToday('a1', 'Thu'), notToday('a1', 'Fri')];
  return { week, checkins };
}

describe('compareWeek', () => {
  test('drift types are the four documented ones', () => {
    assert.deepEqual(DRIFT_TYPES, ['repeated_move', 'all_moved', 'no_log', 'overload']);
  });

  test('fresh week on its first day: on track, nothing done, no drift', () => {
    const result = compareWeek({ week: buildWeek(PATH, 'Mon'), checkins: [], lifelog: LIFELOG, today: 'Mon' });
    assert.deepEqual({ onTrack: result.onTrack, done: result.done, moved: result.moved, planned: result.planned, plateau: result.plateau }, { onTrack: true, done: 0, moved: 0, planned: 3, plateau: false });
    assert.deepEqual(result.drift, []);
  });

  test('repeated_move after two moves of a1 (moves counted from the week and from check-ins)', () => {
    const { week, checkins } = twiceMoved();
    assert.equal(week.actions[0].moves, 2);
    const result = compareWeek({ week, checkins, lifelog: LIFELOG, today: 'Fri' });
    const drift = result.drift.filter((d) => d.type === 'repeated_move');
    assert.equal(drift.length, 1);
    assert.equal(drift[0].actionId, 'a1');
    assert.match(drift[0].note, /moved 2 times/);
    assert.equal(result.onTrack, false);
    assert.equal(result.moved, 1);
    // Check-ins alone are enough when the week object lost its move count.
    const flat = { ...week, actions: week.actions.map((a) => ({ ...a, moves: 0 })) };
    assert.equal(compareWeek({ week: flat, checkins, today: 'Fri' }).drift.some((d) => d.type === 'repeated_move'), true);
    // One move is not drift.
    assert.equal(compareWeek({ week: freshWeek(), checkins: [notToday('a1', 'Thu')], today: 'Thu' }).drift.some((d) => d.type === 'repeated_move'), false);
  });

  test('all_moved when every step is moved and none done', () => {
    let week = freshWeek();
    for (const id of ['a1', 'a2', 'a3']) week = applyCheckin(week, id, 'not_today', 'Thu').week;
    const result = compareWeek({ week, checkins: [], today: 'Thu' });
    assert.equal(result.moved, 3);
    assert.ok(result.drift.some((d) => d.type === 'all_moved'));
    const partly = applyCheckin(freshWeek(), 'a2', 'not_today', 'Thu').week;
    assert.equal(compareWeek({ week: partly, today: 'Thu' }).drift.some((d) => d.type === 'all_moved'), false);
  });

  test('no_log when the lifelog has been silent for 4+ days (ISO today), or nothing at all arrived', () => {
    assert.equal(lifelogGapDays(LIFELOG, '2026-10-26'), 4);
    assert.equal(lifelogGapDays(LIFELOG, 'Thu'), null);
    const silent = compareWeek({ week: freshWeek(), checkins: [], lifelog: LIFELOG, today: '2026-10-26' });
    assert.ok(silent.drift.some((d) => d.type === 'no_log'));
    const recent = compareWeek({ week: freshWeek(), checkins: [], lifelog: LIFELOG, today: '2026-10-25' });
    assert.equal(recent.drift.some((d) => d.type === 'no_log'), false);
    const empty = compareWeek({ week: freshWeek(), checkins: [], lifelog: [], today: 'Mon' });
    assert.ok(empty.drift.some((d) => d.type === 'no_log'));
    const withCheckin = compareWeek({ week: freshWeek(), checkins: [done('a1', 'Tue')], lifelog: [], today: 'Mon' });
    assert.equal(withCheckin.drift.some((d) => d.type === 'no_log'), false);
  });

  test('overload: planned minutes above capacity, or two open steps on one day', () => {
    const over = compareWeek({ week: freshWeek(), checkins: [], lifelog: LIFELOG, today: 'Mon', capacityMinutes: 60 });
    assert.ok(over.drift.some((d) => d.type === 'overload' && /75 planned minutes/.test(d.note)));
    const fits = compareWeek({ week: freshWeek(), checkins: [], lifelog: LIFELOG, today: 'Mon', capacityMinutes: 75 });
    assert.equal(fits.drift.some((d) => d.type === 'overload'), false);
    // a2 (Thu) moved on Wed lands on Thu? No: a2 moved Thu -> Fri; a1 moved from Thu lands on Fri too.
    let week = applyCheckin(freshWeek(), 'a1', 'not_today', 'Thu').week; // a1 Tue -> Fri
    week = applyCheckin(week, 'a2', 'not_today', 'Thu').week; // a2 Thu -> Fri
    const stacked = compareWeek({ week, checkins: [], lifelog: LIFELOG, today: 'Thu' });
    assert.ok(stacked.drift.some((d) => d.type === 'overload' && /2 steps land on Fri/.test(d.note)));
  });

  test('plateau: three or more check-ins but no Done', () => {
    const week = freshWeek();
    assert.equal(compareWeek({ week, checkins: [notToday('a1', 'Tue'), notToday('a2', 'Thu'), notToday('a3', 'Sat')], today: 'Sun' }).plateau, true);
    assert.equal(compareWeek({ week, checkins: [notToday('a1', 'Tue'), notToday('a2', 'Thu')], today: 'Sun' }).plateau, false);
    assert.equal(compareWeek({ week, checkins: [notToday('a1', 'Tue'), notToday('a2', 'Thu'), done('a3', 'Sat')], today: 'Sun' }).plateau, false);
    // With ISO dates only the last 7 days count.
    const dated = [
      { ...notToday('a1', 'Tue'), date: '2026-10-10' },
      { ...notToday('a2', 'Thu'), date: '2026-10-22' },
      { ...notToday('a3', 'Sat'), date: '2026-10-24' },
    ];
    assert.equal(compareWeek({ week, checkins: dated, today: '2026-10-25' }).plateau, false);
    assert.equal(compareWeek({ week, checkins: dated, today: '2026-10-16' }).plateau, false);
  });

  test('a todo step whose weekday has passed is stale (not on track) but not drift', () => {
    const result = compareWeek({ week: freshWeek(), checkins: [], lifelog: LIFELOG, today: 'Thu' });
    assert.deepEqual(result.stale, ['a1']);
    assert.equal(result.onTrack, false);
    assert.deepEqual(result.drift, []);
    const doneA1 = applyCheckin(freshWeek(), 'a1', 'done', 'Thu').week;
    const after = compareWeek({ week: doneA1, checkins: [done('a1', 'Thu')], lifelog: LIFELOG, today: 'Thu' });
    assert.equal(after.onTrack, true);
    assert.equal(after.done, 1);
  });

  test('never throws; notes contain no banned words', () => {
    for (const input of [undefined, null, {}, { week: 'x', checkins: 'y', lifelog: 3, today: 42 }]) {
      const result = compareWeek(input);
      assert.equal(result.planned, 0);
      assert.equal(typeof result.onTrack, 'boolean');
    }
    const { week, checkins } = twiceMoved();
    const result = compareWeek({ week, checkins, lifelog: [], today: '2026-10-30', capacityMinutes: 10 });
    assert.ok(result.drift.length >= 3);
    assert.deepEqual(hasBanned(allStrings(result).join(' ')), []);
  });
});

describe('resizePlan (§6.1) — grow by at most 20%, shrink immediately', () => {
  const weekWith = (minutes, statuses) => ({ actions: statuses.map((status, i) => ({ id: `a${i + 1}`, title: `Step ${i + 1}`, minutes, day: 'Mon', status, moves: 0, short: `Short ${i + 1}` })) });

  test('3/3 done with condition >= 3 -> up, pct 20, minutes capped at 30', () => {
    const up = resizePlan({ week: weekWith(25, ['done', 'done', 'done']), condition: 4 });
    assert.equal(up.direction, 'up');
    assert.equal(up.pct, 20);
    assert.equal(up.minutes, 30);
    assert.equal(up.count, 3);
    const small = resizePlan({ week: weekWith(10, ['done', 'done', 'done']), condition: 3 });
    assert.equal(small.direction, 'up');
    assert.ok(small.pct <= RESIZE_UP_CAP_PCT);
    assert.equal(small.minutes, 12);
  });

  test('already at the 30-minute cap, or condition unknown / low -> keep (no silent growth)', () => {
    assert.equal(resizePlan({ week: weekWith(30, ['done', 'done', 'done']), condition: 5 }).direction, 'keep');
    assert.equal(resizePlan({ week: weekWith(25, ['done', 'done', 'done']) }).direction, 'keep');
    assert.equal(resizePlan({ week: weekWith(25, ['done', 'done', 'done']), condition: null }).direction, 'keep');
    assert.equal(resizePlan({ week: weekWith(25, ['done', 'done', 'done']), condition: 2 }).direction, 'keep');
  });

  test('2/3 -> keep; 1/3 -> down to 2 steps; 0/3 -> down to one 10-minute micro step', () => {
    assert.equal(resizePlan({ week: weekWith(25, ['done', 'done', 'todo']), condition: 4 }).direction, 'keep');
    const two = resizePlan({ week: weekWith(25, ['done', 'moved', 'todo']), condition: 4 });
    assert.deepEqual([two.direction, two.count, two.micro], ['down', 2, false]);
    const one = resizePlan({ week: weekWith(25, ['moved', 'moved', 'todo']), condition: 4 });
    assert.deepEqual([one.direction, one.count, one.micro, one.minutes], ['down', 1, true, 10]);
  });

  test('pct never exceeds the cap for any input', () => {
    for (const minutes of [1, 5, 10, 15, 20, 25, 29, 30, 45]) {
      for (const condition of [1, 2, 3, 4, 5, undefined]) {
        const result = resizePlan({ week: weekWith(minutes, ['done', 'done', 'done']), condition });
        assert.ok(result.pct <= RESIZE_UP_CAP_PCT, `${minutes}/${condition}: ${result.pct}`);
        assert.ok(result.minutes <= 30);
      }
    }
  });
});

describe('weeklyReview', () => {
  const state = (extra) => ({ energy: 4, momentum: 0.6, selfEfficacy: 0.5, capacityMin: 30, dataGapDays: 0, risk: { points: 0, level: 'green', reasons: [] }, ...extra });
  const person = (archetype) => ({ traits: { archetype, stageOfChange: 'action', careerCapital: { knowHow: [], knowWhom: [], knowWhy: [] } }, evidence: [] });

  test('same action moved twice -> the one replan question', () => {
    const { week, checkins } = twiceMoved();
    const review = weeklyReview({ week, checkins, state: state(), person: person('unknown'), today: 'Fri' });
    assert.equal(review.replanQuestion, REPLAN_QUESTION);
    assert.equal(review.replanQuestion, 'Is this the wrong step, or the wrong size?');
    assert.equal(review.replanActionId, 'a1');
    assert.equal(review.escalate, null);
    // Calm: nothing moved twice and no shrink to one step (2/3 done -> keep) -> no question.
    let calmWeek = freshWeek();
    for (const id of ['a1', 'a2']) calmWeek = applyCheckin(calmWeek, id, 'done', 'Sat').week;
    const calm = weeklyReview({ week: calmWeek, checkins: [done('a1', 'Sat'), done('a2', 'Sat')], state: state(), person: person('unknown') });
    assert.equal(calm.resize.direction, 'keep');
    assert.equal(calm.replanQuestion, null);
    assert.equal(calm.replanActionId, null);
  });

  test('resize follows the week: up (<= 20%) only when all done and condition known', () => {
    let week = freshWeek();
    for (const id of ['a1', 'a2', 'a3']) week = applyCheckin(week, id, 'done', 'Sat').week;
    const up = weeklyReview({ week, checkins: ['a1', 'a2', 'a3'].map((id) => done(id, 'Sat')), state: state({ energy: 4 }), person: person('unknown') });
    assert.equal(up.resize.direction, 'up');
    assert.ok(up.resize.pct <= 20);
    assert.equal(up.resize.minutes, 30);
    const unknown = weeklyReview({ week, checkins: [], state: {}, person: person('unknown') });
    assert.equal(unknown.resize.direction, 'keep');
    // Condition history: the mean of the last 7 known values decides.
    const lowHistory = weeklyReview({ week, checkins: [], state: state({ conditions: [4, 4, 2, 2, 2, 2, 2, 2] }), person: person('unknown') });
    assert.equal(lowHistory.resize.direction, 'keep');
  });

  test('0 done -> down to one micro step immediately; seed carries moved steps as micro', () => {
    let week = freshWeek();
    week = applyCheckin(week, 'a2', 'not_today', 'Thu').week;
    const review = weeklyReview({ week, checkins: [notToday('a2', 'Thu')], state: state({ energy: 2 }), person: person('unknown') });
    assert.deepEqual([review.resize.direction, review.resize.count, review.resize.micro], ['down', 1, true]);
    assert.equal(review.nextWeekSeed.actions.length, 1);
    assert.equal(review.nextWeekSeed.actions[0].id, 'a2');
    assert.equal(review.nextWeekSeed.actions[0].variant, 'micro');
    assert.ok(review.nextWeekSeed.actions[0].minutes <= 10);
    assert.equal(review.nextWeekSeed.actions[0].title, 'Write only the subject line');
  });

  test('nextWeekSeed has at most 3 actions, never a done one, moved first', () => {
    let week = freshWeek();
    week = applyCheckin(week, 'a1', 'done', 'Tue').week;
    week = applyCheckin(week, 'a3', 'not_today', 'Sat').week; // last action -> NextWeek
    const review = weeklyReview({ week, checkins: [done('a1', 'Tue'), notToday('a3', 'Sat')], state: state(), person: person('unknown') });
    const ids = review.nextWeekSeed.actions.map((a) => a.id);
    assert.ok(ids.length <= 3);
    assert.ok(!ids.includes('a1'));
    assert.equal(ids[0], 'a3');
    assert.equal(review.nextWeekSeed.actions[0].carriedFrom, 'NextWeek');
    assert.equal(review.nextWeekSeed.actions[0].variant, 'micro');
    assert.equal(review.nextWeekSeed.actions.find((a) => a.id === 'a2').variant, 'full');
  });

  test('income-pressure prior caps the week at two steps', () => {
    let week = freshWeek();
    for (const id of ['a1', 'a2', 'a3']) week = applyCheckin(week, id, 'done', 'Sat').week;
    const review = weeklyReview({ week, checkins: [], state: state({ energy: 5 }), person: person('income-pressure') });
    assert.equal(review.resize.count, 2);
    assert.equal(review.resize.direction, 'keep');
    assert.ok(review.nextWeekSeed.actions.length <= 2);
  });

  test('escalation: crisis language -> 988 message, plan paused, phrase never echoed or stored', () => {
    const phrase = CRISIS_PHRASES[0];
    const freeText = `Rough week. Sometimes I think I will ${phrase} if this keeps going.`;
    const review = weeklyReview({ week: freshWeek(), checkins: [], state: state(), person: person('unknown'), freeText });
    assert.equal(review.escalate.reason, 'crisis_language');
    assert.match(review.escalate.message, /988/);
    assert.doesNotMatch(review.escalate.message, /diagnos|depress|disorder/i);
    assert.ok(!JSON.stringify(review).toLowerCase().includes(phrase), 'the phrase is not in the result');
    assert.deepEqual(review.nextWeekSeed.actions, []);
    assert.deepEqual([review.resize.direction, review.resize.count], ['down', 1]);
    // Array input, mixed case, and clean text.
    assert.equal(detectEscalation({ freeText: ['fine', CRISIS_PHRASES[2].toUpperCase()] }).reason, 'crisis_language');
    assert.equal(detectEscalation({ freeText: 'A tiring but ordinary week.' }), null);
  });

  test('escalation: condition <= 2 on 10 of 14 days -> professional help message, plan shrunk', () => {
    const conditions = [4, 4, 4, 4, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2];
    const review = weeklyReview({ week: freshWeek(), checkins: [], state: state({ conditions }), person: person('unknown') });
    assert.equal(review.escalate.reason, 'low_condition_10_of_14');
    assert.match(review.escalate.message, /doctor or a counselor/);
    assert.deepEqual([review.resize.direction, review.resize.count, review.resize.micro], ['down', 1, true]);
    assert.ok(review.nextWeekSeed.actions.length === 1);
    const nine = [4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 1, 1, 2, 2];
    assert.equal(detectEscalation({ state: state({ conditions: nine }) }), null);
    // Only the last 14 values count.
    assert.equal(detectEscalation({ state: state({ conditions: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4] }) }), null);
  });

  test('escalation: risk red two weeks in a row -> connect with a person', () => {
    assert.equal(detectEscalation({ state: state({ riskHistory: ['amber', 'red', 'red'] }) }).reason, 'risk_red_2_weeks');
    assert.equal(detectEscalation({ state: state({ riskHistory: ['red', 'amber', 'red'] }) }), null);
    assert.equal(detectEscalation({ state: state({ risk: { level: 'red' }, previousRisk: 'red' }) }).reason, 'risk_red_2_weeks');
    assert.equal(detectEscalation({ state: state({ risk: { level: 'red' } }) }), null);
    const review = weeklyReview({ week: freshWeek(), checkins: [], state: state({ riskHistory: ['red', 'red'] }), person: person('unknown') });
    assert.match(review.escalate.message, /connect you with a person/);
  });

  test('one escalation at most, crisis language first', () => {
    const conditions = Array(14).fill(1);
    const result = detectEscalation({ state: state({ conditions, riskHistory: ['red', 'red'] }), freeText: CRISIS_PHRASES[1] });
    assert.equal(result.reason, 'crisis_language');
    assert.equal(detectEscalation({ state: state({ conditions, riskHistory: ['red', 'red'] }) }).reason, 'low_condition_10_of_14');
    assert.equal(detectEscalation(), null);
  });

  test('escalation: economic language -> unemployment insurance and American Job Center resources, text never echoed', () => {
    for (const phrase of ['rent', 'eviction', 'evicted', "can't pay", 'overdue bills', 'no money for']) assert.ok(ECONOMIC_PHRASES.includes(phrase), phrase);
    const freeText = "Rough month. I can't pay rent and the overdue bills keep coming.";
    const review = weeklyReview({ week: freshWeek(), checkins: [], state: state(), person: person('unknown'), freeText });
    assert.equal(review.escalate.reason, 'economic_pressure');
    assert.match(review.escalate.message, /unemployment insurance/i);
    assert.match(review.escalate.message, /American Job Center/);
    assert.doesNotMatch(review.escalate.message, /diagnos|depress|disorder|doctor|counselor/i);
    assert.deepEqual(lint(review.escalate.message), { ok: true, hits: [] });
    assert.deepEqual(hasBanned(review.escalate.message), []);
    const dump = JSON.stringify(review).toLowerCase();
    assert.ok(!dump.includes(freeText.toLowerCase()), 'the free text is not in the result');
    assert.ok(!dump.includes("can't pay") && !dump.includes('overdue bills'), 'no matched phrase is in the result');
    // Array input, mixed case, curly apostrophe, and a bare "rent".
    assert.equal(detectEscalation({ freeText: ['fine', 'I CAN’T PAY the deposit'] }).reason, 'economic_pressure');
    assert.equal(detectEscalation({ freeText: 'Rent is due Friday and there is no money for it.' }).reason, 'economic_pressure');
    // Word boundaries: "current", "different", "parent", "rental" are not money talk.
    assert.equal(detectEscalation({ freeText: 'My current role is different from what my parent did; the rental market is fine.' }), null);
    assert.equal(detectEscalation({ freeText: 'A tiring but ordinary week.' }), null);
  });

  test('escalation: economic pressure caps the week at two steps (income first) instead of one micro step', () => {
    let week = freshWeek();
    for (const id of ['a1', 'a2', 'a3']) week = applyCheckin(week, id, 'done', 'Sat').week;
    const capped = weeklyReview({ week, checkins: [], state: state({ energy: 5 }), person: person('unknown'), freeText: 'Great week, but eviction notice came.' });
    assert.equal(capped.escalate.reason, 'economic_pressure');
    assert.deepEqual([capped.resize.direction, capped.resize.count, capped.resize.micro], ['keep', 2, false]);
    assert.ok(capped.nextWeekSeed.actions.length <= 2);
    // 0 done stays at one micro step (shrink is never undone), and the shrink question stays silent.
    const shrunk = weeklyReview({ week: freshWeek(), checkins: [], state: state(), person: person('unknown'), freeText: 'Evicted next week.' });
    assert.deepEqual([shrunk.resize.direction, shrunk.resize.count, shrunk.resize.micro], ['down', 1, true]);
    assert.equal(shrunk.replanQuestion, null);
  });

  test('crisis language outranks economic language; economic outranks condition and risk', () => {
    const conditions = Array(14).fill(1);
    const both = detectEscalation({ state: state({ conditions, riskHistory: ['red', 'red'] }), freeText: `${CRISIS_PHRASES[0]} because I cannot pay rent` });
    assert.equal(both.reason, 'crisis_language');
    const economic = detectEscalation({ state: state({ conditions, riskHistory: ['red', 'red'] }), freeText: 'cannot pay rent' });
    assert.equal(economic.reason, 'economic_pressure');
    const review = weeklyReview({ week: freshWeek(), checkins: [], state: state({ conditions }), person: person('unknown'), freeText: `rent ${CRISIS_PHRASES[3]}` });
    assert.equal(review.escalate.reason, 'crisis_language');
    assert.deepEqual(review.nextWeekSeed.actions, []);
  });

  test('0 done -> the one replan question, asked once; 1 done or an escalation -> none', () => {
    const zero = weeklyReview({ week: freshWeek(), checkins: [], state: state(), person: person('unknown') });
    assert.deepEqual([zero.resize.direction, zero.resize.count], ['down', 1]);
    assert.equal(zero.replanQuestion, REPLAN_QUESTION);
    assert.equal(zero.replanActionId, null);
    assert.equal(allStrings(zero).filter((s) => s === REPLAN_QUESTION).length, 1);
    // A repeated move on a 0-done week still yields exactly one question, tied to the moved step.
    const { week, checkins } = twiceMoved();
    const moved = weeklyReview({ week, checkins, state: state(), person: person('unknown'), today: 'Fri' });
    assert.equal(moved.replanQuestion, REPLAN_QUESTION);
    assert.equal(moved.replanActionId, 'a1');
    assert.equal(allStrings(moved).filter((s) => s === REPLAN_QUESTION).length, 1);
    // 1 done -> down to two steps, no question.
    const one = applyCheckin(freshWeek(), 'a1', 'done', 'Tue').week;
    const oneDone = weeklyReview({ week: one, checkins: [done('a1', 'Tue')], state: state(), person: person('unknown') });
    assert.deepEqual([oneDone.resize.direction, oneDone.resize.count, oneDone.replanQuestion], ['down', 2, null]);
    // An escalation carries its own sentence: the shrink question stays silent.
    const low = weeklyReview({ week: freshWeek(), checkins: [], state: state({ conditions: Array(14).fill(1) }), person: person('unknown') });
    assert.equal(low.escalate.reason, 'low_condition_10_of_14');
    assert.equal(low.replanQuestion, null);
  });

  test('every sentence the review can produce is free of banned words', () => {
    const texts = [...Object.values(monitor.ESCALATION_MESSAGES), REPLAN_QUESTION];
    const { week, checkins } = twiceMoved();
    texts.push(...allStrings(weeklyReview({ week, checkins, state: state(), person: person('unknown'), today: 'Fri' })));
    texts.push(...allStrings(weeklyReview({ week: freshWeek(), checkins: [], state: state({ riskHistory: ['red', 'red'] }), person: person('income-pressure') })));
    texts.push(...allStrings(weeklyReview({ week: freshWeek(), checkins: [], state: state(), person: person('unknown'), freeText: 'no money for the bus' })));
    assert.deepEqual(hasBanned(texts.join(' ')), []);
    for (const message of Object.values(monitor.ESCALATION_MESSAGES)) assert.deepEqual(lint(message), { ok: true, hits: [] });
  });

  test('never throws and is deterministic', () => {
    for (const input of [undefined, null, {}, { week: 1, checkins: 'x', state: 'y', person: 2, freeText: 9 }]) {
      const review = weeklyReview(input);
      assert.equal(review.escalate, null);
      assert.equal(review.replanQuestion, null);
      assert.deepEqual(review.nextWeekSeed.actions, []);
    }
    const { week, checkins } = twiceMoved();
    const input = { week, checkins, state: state({ conditions: [3, 3, 2] }), person: person('identity-grief'), today: 'Fri' };
    assert.deepEqual(weeklyReview(input), weeklyReview(input));
  });
});
