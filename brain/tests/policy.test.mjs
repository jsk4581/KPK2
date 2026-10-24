// policy.test.mjs — decideIntervention branches and explain().
// Run: cd brain && node --test tests/
// Weeks are built with Build's logic.buildWeek. Every value here is synthetic. Sample persona — synthetic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as logic from '../../app/logic.js';
import * as policy from '../policy.js';
import * as state from '../state.js';
import * as constraint from '../constraint.js';
import * as messages from '../messages.js';
import { explain } from '../explain.js';

// ---------- inline fixtures (synthetic) ----------
const PATH = {
  role_id: 'messaging-consultant',
  title: 'Messaging & Positioning Consultant',
  week: {
    actions: [
      { title: 'Turn one past project into a one-page before/after story', minutes: 30, day: 'Tue', short: 'Write the before line and the after line.' },
      { title: 'Draft a pilot offer email', minutes: 25, day: 'Thu', short: 'Write only the subject line.' },
      { title: 'List the 7 questions you really ask', minutes: 20, day: 'Sat', short: 'Write the first 3 questions.' },
    ],
  },
};

const freshWeek = (today = 'Thu') => logic.buildWeek(PATH, today);

function stateStub({ energy = null, level = 'green', dataGapDays = 0, capacityMin, features = [] } = {}) {
  return {
    energy,
    capacityMin: capacityMin ?? state.capacityMinutes(energy),
    dataGapDays,
    risk: { points: level === 'red' ? 4 : level === 'amber' ? 2 : 0, level, reasons: [], checks: [] },
    features,
  };
}

const decide = (overrides = {}) => policy.decideIntervention({ state: stateStub(), constraint: { constraint: 'unknown' }, week: freshWeek(), today: 'Thu', checkins: [], ...overrides });

describe('decideIntervention: branches', () => {
  test('no checkable action -> none', () => {
    const week = freshWeek();
    week.actions.forEach((a) => { a.status = 'done'; });
    const d = decide({ week });
    assert.equal(d.kind, 'none');
    assert.equal(d.actionId, null);
    assert.equal(d.messageKey, 'NONE');
    assert.equal(d.choices.length, 2);
    assert.deepEqual(d.reasons, ['no_checkable_action']);
  });

  test('only future actions -> none, naming the next day', () => {
    const d = decide({ week: freshWeek('Mon'), today: 'Mon' });
    assert.equal(d.kind, 'none');
    assert.equal(d.nextDay, 'Tue');
    assert.deepEqual(d.reasons, ['no_action_today']);
  });

  test('data gap >= 4 days -> reconnect with a micro step', () => {
    const d = decide({ state: stateStub({ energy: 4, dataGapDays: 4 }) });
    assert.equal(d.kind, 'reconnect');
    assert.equal(d.messageKey, 'RECONNECT');
    assert.equal(d.actionId, 'a2');
    assert.ok(d.minutes <= 10);
    assert.equal(d.variant, 'micro');
    assert.equal(d.choices.length, 2);
    assert.ok(d.reasons.includes('data_gap_days>=4'));
  });

  test('condition <= 2 -> shrink, rest first, two choices (rest moves to Fri / micro <= 10 min)', () => {
    const d = decide({ state: stateStub({ energy: 2, level: 'amber' }) });
    assert.equal(d.kind, 'shrink');
    assert.equal(d.messageKey, 'LOW_ENERGY');
    assert.equal(d.lead, 'rest_first');
    assert.equal(d.actionId, 'a2');
    assert.ok(d.minutes <= 10);
    assert.deepEqual(d.choices, ['Rest today — moves to Fri', 'Write only the subject line. (≤10 min)']);
    assert.ok(d.reasons.includes('energy<=2'));
  });

  test('risk red with normal energy -> shrink (SHRINK), rest first', () => {
    const d = decide({ state: stateStub({ energy: 4, level: 'red' }) });
    assert.equal(d.kind, 'shrink');
    assert.equal(d.messageKey, 'SHRINK');
    assert.equal(d.lead, 'rest_first');
    assert.equal(d.choices[0], 'Rest today — moves to Fri');
    assert.ok(d.reasons.includes('risk_red'));
  });

  test('condition <= 2 and risk red together -> rest', () => {
    const d = decide({ state: stateStub({ energy: 1, level: 'red' }) });
    assert.equal(d.kind, 'rest');
    assert.equal(d.lead, 'rest_first');
    assert.equal(d.messageKey, 'LOW_ENERGY');
    assert.ok(d.minutes <= 10);
  });

  test('previous check-in was Not today and today is do-able -> comeback', () => {
    const moved = logic.applyCheckin(freshWeek(), 'a2', 'not_today', 'Thu');
    assert.equal(moved.ok, true);
    const checkins = [{ actionId: 'a2', kind: 'not_today', day: 'Thu' }];
    const d = decide({ state: stateStub({ energy: 4 }), week: moved.week, checkins });
    assert.equal(d.kind, 'comeback');
    assert.equal(d.messageKey, 'COMEBACK');
    assert.equal(d.actionId, 'a1', 'the overdue Tue action is the one for today');
    assert.equal(d.variant, 'micro');
    assert.deepEqual(d.choices, ['Write the before line and the after line. (≤10 min)', 'Full version (30 min)']);
    assert.ok(d.reasons.includes('after_not_today'));
  });

  test('comeback also comes from the last check-in alone (week flag cleared)', () => {
    const d = decide({ state: stateStub({ energy: 4 }), checkins: [{ actionId: 'a1', kind: 'not_today', day: 'Tue' }] });
    assert.equal(d.kind, 'comeback');
  });

  test('low energy wins over comeback: rest first, not "welcome back"', () => {
    const d = decide({ state: stateStub({ energy: 2 }), checkins: [{ actionId: 'a1', kind: 'not_today', day: 'Tue' }] });
    assert.equal(d.kind, 'shrink');
    assert.equal(d.messageKey, 'LOW_ENERGY');
  });

  test('capacity below the action length -> shrink with micro / full choices', () => {
    const d = decide({ state: stateStub({ energy: 3 }) }); // 21 min < 25
    assert.equal(d.kind, 'shrink');
    assert.equal(d.messageKey, 'SHRINK');
    assert.equal(d.lead, 'do');
    assert.deepEqual(d.choices, ['Write only the subject line. (≤10 min)', 'Full version (25 min)']);
    assert.ok(d.reasons.includes('capacity<minutes'));
  });

  test('otherwise -> full with Done / Not today', () => {
    const d = decide({ state: stateStub({ energy: 4 }) });
    assert.equal(d.kind, 'full');
    assert.equal(d.messageKey, 'FULL');
    assert.equal(d.actionId, 'a2');
    assert.equal(d.minutes, 25);
    assert.equal(d.variant, 'full');
    assert.deepEqual(d.choices, ['Done', 'Not today']);
    assert.equal(d.day, 'Thu');
    assert.equal(d.nextDay, 'Fri');
  });

  test('no condition reported -> capacity 30 -> full (nothing inferred)', () => {
    const d = decide({ state: stateStub({ energy: null }) });
    assert.equal(d.kind, 'full');
  });

  test('an action moved twice gets the CARRIED question instead of another nudge', () => {
    const week = freshWeek();
    week.actions[1].moves = 2;
    week.actions[1].status = 'moved';
    const d = decide({ state: stateStub({ energy: 4 }), week });
    assert.equal(d.kind, 'full');
    assert.equal(d.messageKey, 'CARRIED');
    assert.ok(d.reasons.includes('moves>=2'));
  });

  test('gate passed -> gate with GATE_PASS', () => {
    const d = decide({ state: stateStub({ energy: 4 }), gate: { passed: true, name: 'Fit gate', evidence: 'one session booked', next: 'Proof', weeks: 3 } });
    assert.equal(d.kind, 'gate');
    assert.equal(d.messageKey, 'GATE_PASS');
    assert.equal(d.slots.gate, 'Fit gate');
  });
});

describe('decideIntervention: invariants', () => {
  test('exactly one action per day, always two choices, kind is a known kind', () => {
    const cases = [
      decide(),
      decide({ state: stateStub({ energy: 2 }) }),
      decide({ state: stateStub({ energy: 4, dataGapDays: 5 }) }),
      decide({ state: stateStub({ energy: 4, level: 'red' }) }),
      decide({ week: freshWeek('Mon'), today: 'Mon' }),
    ];
    for (const d of cases) {
      assert.ok(policy.INTERVENTION_KINDS.includes(d.kind));
      assert.equal(d.choices.length, 2);
      assert.ok(d.actionId === null || typeof d.actionId === 'string');
      assert.equal(messages.lint(d.choices).ok, true);
    }
  });

  test('ISO today resolves to a weekday; positional form equals object form', () => {
    const iso = decide({ today: '2026-10-15' });
    const named = decide({ today: 'Thu' });
    assert.deepEqual(iso, named);
    const st = stateStub({ energy: 4 });
    assert.deepEqual(policy.decideIntervention(st, { constraint: 'unknown' }, freshWeek(), 'Thu', []), decide({ state: st }));
  });

  test('the input week is not mutated and the result is deterministic', () => {
    const week = freshWeek();
    const snapshot = JSON.stringify(week);
    const a = decide({ week, state: stateStub({ energy: 2 }) });
    const b = decide({ week, state: stateStub({ energy: 2 }) });
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(week), snapshot);
  });

  test('decision slots render every message key without lint hits', () => {
    const d = decide({ state: stateStub({ energy: 2, level: 'amber' }) });
    const out = messages.render(d.messageKey, d.slots);
    assert.equal(out.lint.ok, true);
    assert.equal(out.ack, 'Energy 2/5 today.');
    assert.ok(out.next.includes('Write only the subject line.'));
  });

  test('missing week or state still returns none/full without throwing', () => {
    assert.equal(policy.decideIntervention({}).kind, 'none');
    assert.equal(policy.decideIntervention({ week: freshWeek(), today: 'Thu' }).kind, 'full');
  });

  test('a title with a banned phrase never reaches the choices or the message; the action keeps its own title', () => {
    const week = freshWeek();
    week.actions[1].title = 'Rewrite the failed page because you missed day one';
    week.actions[1].short = 'Fix the streak';
    for (const st of [stateStub({ energy: 2 }), stateStub({ energy: 4, dataGapDays: 5 }), stateStub({ energy: 4 })]) {
      const d = decide({ week, state: st });
      assert.equal(d.actionId, 'a2');
      assert.equal(messages.lint(d.choices).ok, true, d.choices.join(' | '));
      assert.equal(messages.render(d.messageKey, d.slots).lint.ok, true);
      assert.equal(d.action.title, week.actions[1].title);
    }
    assert.ok(decide({ week, state: stateStub({ energy: 2 }) }).choices[1].startsWith('the 10-minute version'));
  });
});

// ---------- full pipeline on the day-11 scenario (state -> constraint -> policy -> explain) ----------
// Same 14-day synthetic arc as state.test.mjs (2026-10-05 Mon .. 2026-10-15 Thu = day 11).
const LABEL = { _label: 'synthetic' };
const ARC = [
  ['2026-10-05', 'Mon', 4, { actionId: 'w1a1', kind: 'done', minutes: 25 }],
  ['2026-10-06', 'Tue', 4, null],
  ['2026-10-07', 'Wed', 3, { actionId: 'w1a2', kind: 'done', minutes: 25 }],
  ['2026-10-08', 'Thu', null, null],
  ['2026-10-09', 'Fri', 4, { actionId: 'w1a3', kind: 'done', minutes: 20 }],
  ['2026-10-10', 'Sat', 3, null],
  ['2026-10-11', 'Sun', null, null],
  ['2026-10-12', 'Mon', 3, { actionId: 'a1', kind: 'done', minutes: 25 }],
  ['2026-10-13', 'Tue', 2, null],
  ['2026-10-14', 'Wed', 2, { actionId: 'a2', kind: 'not_today', reason: 'energy' }],
  ['2026-10-15', 'Thu', 2, { actionId: 'a2', kind: 'not_today', reason: 'energy' }],
];
const DAY11 = {
  lifelog: ARC.filter(([, , cond]) => cond !== null).map(([date, , cond], i) => ({
    ...LABEL, id: `l${String(i + 1).padStart(2, '0')}`, date, source: 'note', title: `Note ${i + 1}`, summary: 'Sample persona — synthetic.', tags: [], url: null, condition: cond,
  })),
  checkins: ARC.filter(([, , , checkin]) => checkin).map(([date, day, , checkin]) => ({ ...checkin, day, date })),
  today: '2026-10-15',
};

describe('pipeline + explain', () => {
  test('day 11: amber state -> motivation-automatic -> shrink (rest first) -> explain cites real ids', () => {
    const st = state.estimateState(DAY11);
    assert.equal(st.risk.level, 'amber');
    const root = constraint.rootConstraint(DAY11);
    assert.equal(root.constraint, 'motivation-automatic');

    const week = freshWeek('Thu');
    const decision = policy.decideIntervention({ state: st, constraint: root, week, today: DAY11.today, checkins: DAY11.checkins });
    assert.equal(decision.kind, 'shrink');
    assert.equal(decision.messageKey, 'LOW_ENERGY');

    const why = explain(decision, { ...DAY11, state: st, constraint: root, week });
    assert.ok(why.rules.includes('policy:energy<=2'));
    assert.ok(why.rules.includes('risk:consec_rest'));
    assert.ok(why.rules.includes('risk:low_condition'));
    assert.ok(why.rules.includes('constraint:motivation-automatic'));
    assert.ok(why.evidence.length > 0);

    const lifelogIds = new Set(DAY11.lifelog.map((i) => i.id));
    const checkinIds = new Set(DAY11.checkins.map(state.checkinId));
    const featureDates = new Set(st.features.map((f) => f.date));
    for (const e of why.evidence) {
      if (e.type === 'lifelog') assert.ok(lifelogIds.has(e.id), `lifelog ${e.id} exists`);
      else if (e.type === 'checkin') assert.ok(checkinIds.has(e.id), `checkin ${e.id} exists`);
      else if (e.type === 'feature') assert.ok(featureDates.has(e.date), `feature ${e.date} exists`);
      else assert.fail(`unknown evidence type ${e.type}`);
      assert.equal(typeof e.note, 'string');
    }
    assert.ok(why.evidence.some((e) => e.type === 'lifelog' && e.id === st.energySource.id));
    assert.ok(why.evidence.some((e) => e.type === 'checkin' && e.id === 'a2@2026-10-15'));
    assert.ok(why.evidence.some((e) => e.type === 'checkin' && e.id === 'a2@2026-10-14'));
    assert.ok(why.evidence.some((e) => e.type === 'feature' && e.date === '2026-10-15'));

    for (const t of why.trace) {
      assert.deepEqual(Object.keys(t).sort(), ['fn', 'input', 'output', 'via']);
      assert.equal(t.via, 'brain');
      assert.ok(t.input.length <= 240 && t.output.length <= 240);
    }
    assert.deepEqual(why.trace.map((t) => t.fn), ['estimateState', 'rootConstraint', 'decideIntervention']);
    assert.ok(why.text.startsWith('shrink a2 (10 min) -> LOW_ENERGY'));
    assert.equal(messages.lint(why.text).ok, true);
  });

  test('explain lists skipped risk checks instead of presenting them as clear', () => {
    const st = state.estimateState({ lifelog: [], checkins: [{ actionId: 'a1', kind: 'done', day: 'Mon', date: '2026-10-12' }], today: '2026-10-12' });
    const why = explain({ kind: 'full', actionId: 'a1', minutes: 25, messageKey: 'FULL', reasons: ['capacity_ok'] }, { state: st, lifelog: [], checkins: [] });
    assert.ok(why.rules.includes('risk:data_gap:skipped'));
    assert.ok(why.rules.includes('risk:low_condition:skipped'));
  });

  test('explain never throws on empty input', () => {
    const why = explain(null, null);
    assert.deepEqual(why.rules, []);
    assert.deepEqual(why.evidence, []);
    assert.equal(typeof why.text, 'string');
  });
});
