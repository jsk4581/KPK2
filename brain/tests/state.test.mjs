// state.test.mjs — estimateState on a synthetic 14-day log (ALGORITHM_DESIGN §9.2 shape).
// Run: cd brain && node --test tests/
// Every value here is synthetic. Sample persona — synthetic. No real person is described.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as state from '../state.js';

// The shared synthetic scenario (brain/data/dana-14d.json) for the replay regression below.
const DANA = JSON.parse(readFileSync(new URL('../data/dana-14d.json', import.meta.url), 'utf8'));

// ---------- inline fixture: 14 days, 2026-10-05 (Mon) .. 2026-10-18 (Sun) ----------
// day 1–8 normal · 9–11 condition 2 with two Not today · 12 micro comeback · 14 green.
const LABEL = { _label: 'synthetic' };
const DAYS = [
  { n: 1, date: '2026-10-05', day: 'Mon', cond: 4, checkin: { actionId: 'w1a1', kind: 'done', minutes: 25 } },
  { n: 2, date: '2026-10-06', day: 'Tue', cond: 4 },
  { n: 3, date: '2026-10-07', day: 'Wed', cond: 3, checkin: { actionId: 'w1a2', kind: 'done', minutes: 25 } },
  { n: 4, date: '2026-10-08', day: 'Thu', cond: null },
  { n: 5, date: '2026-10-09', day: 'Fri', cond: 4, checkin: { actionId: 'w1a3', kind: 'done', minutes: 20 } },
  { n: 6, date: '2026-10-10', day: 'Sat', cond: 3 },
  { n: 7, date: '2026-10-11', day: 'Sun', cond: null },
  { n: 8, date: '2026-10-12', day: 'Mon', cond: 3, checkin: { actionId: 'w2a1', kind: 'done', minutes: 25 } },
  { n: 9, date: '2026-10-13', day: 'Tue', cond: 2 },
  { n: 10, date: '2026-10-14', day: 'Wed', cond: 2, checkin: { actionId: 'w2a2', kind: 'not_today', reason: 'energy' } },
  { n: 11, date: '2026-10-15', day: 'Thu', cond: 2, checkin: { actionId: 'w2a2', kind: 'not_today', reason: 'energy' } },
  { n: 12, date: '2026-10-16', day: 'Fri', cond: 3, checkin: { actionId: 'w2a3', kind: 'done', variant: 'micro', minutes: 10 } },
  { n: 13, date: '2026-10-17', day: 'Sat', cond: 3, checkin: { actionId: 'w2a2', kind: 'done', variant: 'micro', minutes: 10 } },
  { n: 14, date: '2026-10-18', day: 'Sun', cond: 4 },
];

// Lifelog + check-ins up to and including day `through`.
function scenario(through) {
  const lifelog = [];
  const checkins = [];
  for (const d of DAYS.filter((x) => x.n <= through)) {
    if (d.cond !== null) {
      lifelog.push({ ...LABEL, id: `l${String(d.n).padStart(2, '0')}`, date: d.date, source: 'note', title: `Day ${d.n} note`, summary: 'Sample persona — synthetic.', tags: [], url: null, condition: d.cond });
    }
    if (d.checkin) checkins.push({ ...d.checkin, day: d.day, date: d.date });
  }
  const today = DAYS.find((x) => x.n === through).date;
  return { lifelog, checkins, today };
}

describe('estimateState: 14-day synthetic scenario', () => {
  test('day 11 is amber with consec_rest and low_condition', () => {
    const s = state.estimateState(scenario(11));
    assert.equal(s.today, '2026-10-15');
    assert.equal(s.energy, 2);
    // condition 2 -> base 12; days 9-11 (2,2,2) vs days 6-8 (3,-,3) -> trend -1 -> x0.8 -> 10
    assert.equal(s.condTrend, -1);
    assert.equal(s.capacityBase, 12);
    assert.equal(s.capacityFactor, 0.8);
    assert.equal(s.capacityMin, 10);
    assert.deepEqual(s.capacityReasons, ['cond_trend_down']);
    // days 4 and 7 have no note and no check-in -> 9 of 11 logged; last 7 rows (days 5-11) -> 6/7
    assert.equal(s.showedUp, 9);
    assert.equal(s.consistency7, 0.86);
    assert.equal(s.consecRest, 2);
    assert.equal(s.condMean3, 2);
    assert.equal(s.dataGapDays, 0);
    assert.equal(s.gapDays, 0);
    assert.equal(s.risk.points, 3);
    assert.equal(s.risk.level, 'amber');
    assert.ok(s.risk.reasons.includes('consec_rest'));
    assert.ok(s.risk.reasons.includes('low_condition'));
    assert.ok(s.momentum > 0.35, `momentum ${s.momentum} stays above the risk line`);
    assert.ok(s.selfEfficacy > 0.4, `self-efficacy ${s.selfEfficacy} stays above the risk line`);
    assert.equal(s.features.length, 11);
  });

  test('day 14 (after done on 12 and 13) is green', () => {
    const s = state.estimateState(scenario(14));
    assert.equal(s.risk.level, 'green');
    assert.equal(s.risk.points, 0);
    assert.deepEqual(s.risk.reasons, []);
    assert.equal(s.consecRest, 0);
    assert.equal(s.energy, 4);
    assert.equal(s.capacityMin, 30);
    assert.equal(s.capacityFactor, 1);
    assert.deepEqual(s.capacityReasons, []);
    assert.equal(s.showedUp, 12);
    assert.equal(s.consistency7, 1);
    assert.equal(s.features.length, 14);
    // day 11: 0.534 -> done, done, logged -> 0.69
    assert.equal(s.momentum, 0.69);
    assert.ok(s.momentum > state.estimateState(scenario(11)).momentum, 'momentum recovered after day 11');
  });

  test('micro done after a rest day adds the +0.05 self-efficacy bonus (day 12)', () => {
    const s = state.estimateState(scenario(12));
    const day12 = s.features.find((f) => f.date === '2026-10-16');
    assert.equal(day12.efficacyBonus, 0.05);
    // day 11: 0.509 -> day 12: 0.2*1 + 0.8*0.509 + 0.05
    const day11 = s.features.find((f) => f.date === '2026-10-15');
    assert.equal(day12.selfEfficacy, Math.round((0.2 + 0.8 * day11.selfEfficacy + 0.05) * 1000) / 1000);
  });

  test('per-day feature table carries the ids explain() needs', () => {
    const s = state.estimateState(scenario(11));
    const day10 = s.features.find((f) => f.date === '2026-10-14');
    assert.equal(day10.day, 'Wed');
    assert.equal(day10.logged, true);
    assert.deepEqual(day10.lifelogIds, ['l10']);
    assert.deepEqual(day10.checkins, [{ id: 'w2a2@2026-10-14', actionId: 'w2a2', kind: 'not_today' }]);
    assert.equal(day10.notToday, 1);
    assert.equal(day10.score, 0.5);
    assert.equal(day10.condition, 2);
    const day4 = s.features.find((f) => f.date === '2026-10-08');
    assert.equal(day4.logged, false);
    assert.equal(day4.score, 0);
    assert.equal(day4.condition, null);
  });
});

describe('estimateState: data gaps', () => {
  test('three days without a lifelog item -> dataGapDays 3, reasons data_gap + gap_days', () => {
    const { lifelog, checkins } = scenario(14);
    const s = state.estimateState({ lifelog, checkins, today: '2026-10-21' });
    assert.equal(s.dataGapDays, 3);
    assert.equal(s.gapDays, 3);
    assert.ok(s.risk.reasons.includes('data_gap'));
    assert.ok(s.risk.reasons.includes('gap_days'));
    assert.equal(s.risk.checks.find((c) => c.rule === 'data_gap').points, 1);
    assert.equal(s.risk.checks.find((c) => c.rule === 'gap_days').points, 2);
    // three silent days also pull momentum under 0.35 (0.69 -> 0.237): 2 + 1 + 1
    assert.ok(s.risk.reasons.includes('low_momentum'));
    assert.equal(s.risk.points, 4);
    assert.equal(s.risk.level, 'red');
    assert.equal(s.lastLogId, 'l14');
  });

  test('gap of 4+ days scores +3 (gap_days) and +1 (data_gap)', () => {
    const { lifelog, checkins } = scenario(14);
    const s = state.estimateState({ lifelog, checkins, today: '2026-10-22' });
    assert.equal(s.dataGapDays, 4);
    assert.equal(s.risk.checks.find((c) => c.rule === 'gap_days').points, 3);
    assert.equal(s.risk.checks.find((c) => c.rule === 'data_gap').points, 1);
    assert.equal(s.risk.points, 5);
    assert.equal(s.risk.level, 'red');
  });

  test('a short gap of 1 day scores nothing', () => {
    const { lifelog, checkins } = scenario(14);
    const s = state.estimateState({ lifelog, checkins, today: '2026-10-19' });
    assert.equal(s.dataGapDays, 1);
    assert.equal(s.gapDays, 1);
    assert.ok(!s.risk.reasons.includes('data_gap'));
    assert.ok(!s.risk.reasons.includes('gap_days'));
    assert.equal(s.risk.level, 'green');
  });

  test('a check-in without a lifelog item keeps gap_days at 0 but data_gap counts', () => {
    const { lifelog, checkins } = scenario(14);
    const more = [...checkins, { actionId: 'w3a1', kind: 'done', day: 'Tue', date: '2026-10-20' }];
    const s = state.estimateState({ lifelog, checkins: more, today: '2026-10-20' });
    assert.equal(s.gapDays, 0);
    assert.equal(s.dataGapDays, 2);
    assert.ok(s.risk.reasons.includes('data_gap'));
    assert.ok(!s.risk.reasons.includes('gap_days'));
  });

  test('no lifelog at all -> dataGapDays null and the data_gap check is reported as skipped', () => {
    const s = state.estimateState({ lifelog: [], checkins: [{ actionId: 'a1', kind: 'done', day: 'Mon', date: '2026-10-05' }], today: '2026-10-06' });
    assert.equal(s.dataGapDays, null);
    const check = s.risk.checks.find((c) => c.rule === 'data_gap');
    assert.equal(check.status, 'skipped');
    assert.ok(!s.risk.reasons.includes('data_gap'));
  });
});

describe('estimateState: events after today are ignored (replay a past day from the full history)', () => {
  test('inline fixture: all 14 days with today = day 11 equals the day-11 slice (amber)', () => {
    const { lifelog, checkins } = scenario(14);
    const day11 = DAYS.find((x) => x.n === 11).date;
    const replayed = state.estimateState({ lifelog, checkins, today: day11 });
    const sliced = state.estimateState(scenario(11));
    assert.equal(replayed.consecRest, 2, 'the done check-ins of days 12-13 are after today');
    assert.equal(replayed.risk.level, 'amber');
    assert.deepEqual(replayed.risk.reasons, ['consec_rest', 'low_condition']);
    assert.equal(replayed.lastLogId, 'l11');
    assert.equal(replayed.dataGapDays, 0);
    assert.equal(replayed.features.length, 11);
    assert.deepEqual(replayed, sliced);
  });

  test('dana-14d.json: full history + today = expected.day11.date reproduces the day-11 amber', () => {
    const { date, riskLevel, reasons } = DANA.expected.day11;
    const full = state.estimateState({ lifelog: DANA.lifelog, checkins: DANA.checkins, today: date });
    const sliced = state.estimateState({
      lifelog: DANA.lifelog.filter((item) => item.date <= date),
      checkins: DANA.checkins.filter((c) => c.date <= date),
      today: date,
    });
    assert.equal(full.today, date);
    assert.equal(full.risk.level, riskLevel);
    assert.deepEqual(full.risk.reasons, reasons);
    assert.equal(full.consecRest, 2);
    assert.deepEqual(full, sliced);
    // the same history at the scenario's own today is still the day-14 green
    assert.equal(state.estimateState({ lifelog: DANA.lifelog, checkins: DANA.checkins, today: DANA.today }).risk.level, DANA.expected.day14.riskLevel);
  });

  test('lifelog after today does not count as the last log', () => {
    const { lifelog, checkins } = scenario(14);
    const s = state.estimateState({ lifelog, checkins, today: '2026-10-12' });
    assert.equal(s.lastLogId, 'l08');
    assert.equal(s.lastLogDate, '2026-10-12');
    assert.equal(s.dataGapDays, 0);
    assert.equal(s.features.length, 8);
    assert.ok(s.features.every((f) => f.date <= '2026-10-12'));
  });

  test('a Not today dated after today is not a trailing rest day', () => {
    const checkins = [
      { actionId: 'a1', kind: 'done', day: 'Mon', date: '2026-10-05' },
      { actionId: 'a2', kind: 'not_today', day: 'Tue', date: '2026-10-20' },
      { actionId: 'a3', kind: 'not_today', day: 'Wed', date: '2026-10-21' },
    ];
    const s = state.estimateState({ lifelog: [], checkins, today: '2026-10-06' });
    assert.equal(s.consecRest, 0);
    assert.ok(!s.risk.reasons.includes('consec_rest'));
    // and once today has caught up they count again
    assert.equal(state.estimateState({ lifelog: [], checkins, today: '2026-10-21' }).consecRest, 2);
  });

  test('weekday-only check-ins (no date) still count: they resolve on or before today', () => {
    const checkins = [
      { actionId: 'a1', kind: 'not_today', day: 'Mon' },
      { actionId: 'a2', kind: 'not_today', day: 'Tue' },
    ];
    assert.equal(state.estimateState({ lifelog: [], checkins, today: '2026-10-14' }).consecRest, 2);
    assert.equal(state.estimateState({ lifelog: [], checkins, today: 'Wed' }).consecRest, 2);
  });
});

describe('capacity table', () => {
  test('30 x g(condition) -> 6 / 12 / 21 / 30 / 30, null -> 30', () => {
    assert.deepEqual([1, 2, 3, 4, 5].map(state.capacityMinutes), [6, 12, 21, 30, 30]);
    assert.equal(state.capacityMinutes(null), 30);
    assert.equal(state.capacityMinutes(undefined), 30);
    assert.equal(state.capacityMinutes(7), 30);
    assert.equal(state.capacityMinutes('2'), 12);
  });

  test('estimateState uses the live condition argument for capacity and energy', () => {
    const { lifelog, checkins, today } = scenario(14);
    for (const [cond, cap] of [[1, 6], [2, 12], [3, 21], [4, 30], [5, 30]]) {
      const s = state.estimateState({ lifelog, checkins, today, condition: cond });
      assert.equal(s.energy, cond);
      assert.equal(s.capacityMin, cap);
      assert.deepEqual(s.energySource, { type: 'arg', date: today });
    }
  });
});

describe('capacity trend factor h(cond_trend) (§4.3)', () => {
  // Six consecutive days of notes with the given conditions; today is the last day.
  function conditionRun(conditions, start = '2026-10-05') {
    const startOrd = state.dateOrdinal(start);
    const lifelog = conditions.map((condition, i) => ({
      ...LABEL, id: `c${i + 1}`, date: state.ordinalDate(startOrd + i), source: 'note', title: `Note ${i + 1}`, summary: 'Sample persona — synthetic.', tags: [], url: null, condition,
    }));
    return { lifelog, checkins: [], today: state.ordinalDate(startOrd + conditions.length - 1) };
  }

  test('trend -1 -> capacity 17 from 21', () => {
    const s = state.estimateState(conditionRun([4, 4, 4, 3, 3, 3]));
    assert.equal(s.energy, 3);
    assert.equal(s.condTrend, -1);
    assert.equal(s.capacityBase, 21);
    assert.equal(s.capacityFactor, state.TREND_FACTOR);
    assert.equal(s.capacityMin, 17);
    assert.deepEqual(s.capacityReasons, ['cond_trend_down']);
    assert.equal(s.capacityRules.cond_trend_down, state.CAPACITY_RULES.cond_trend_down);
  });

  test('no change when trend flat', () => {
    const s = state.estimateState(conditionRun([3, 3, 3, 3, 3, 3]));
    assert.equal(s.condTrend, 0);
    assert.equal(s.capacityBase, 21);
    assert.equal(s.capacityFactor, 1);
    assert.equal(s.capacityMin, 21);
    assert.deepEqual(s.capacityReasons, []);
  });

  test('a dip short of -1 (-0.667) and a rising trend apply nothing', () => {
    const dip = state.estimateState(conditionRun([4, 4, 3, 3, 3, 3]));
    assert.equal(dip.condTrend, -0.667);
    assert.equal(dip.capacityMin, 21);
    const rise = state.estimateState(conditionRun([2, 2, 2, 3, 3, 3]));
    assert.equal(rise.condTrend, 1);
    assert.equal(rise.capacityMin, 21);
    assert.deepEqual(rise.capacityReasons, []);
  });

  test('a steeper fall (-2) is still x0.8, never more', () => {
    const s = state.estimateState(conditionRun([5, 5, 5, 3, 3, 3]));
    assert.equal(s.condTrend, -2);
    assert.equal(s.capacityFactor, 0.8);
    assert.equal(s.capacityMin, 17);
  });

  test('no earlier window -> trend null -> factor 1', () => {
    const s = state.estimateState(conditionRun([3, 3, 3]));
    assert.equal(s.condTrend, null);
    assert.equal(s.capacityFactor, 1);
    assert.equal(s.capacityMin, 21);
  });

  test('energy null keeps the base 30 even when a stale trend is falling', () => {
    // scenario(9) ends on 2026-10-13 (condition 2); two days later energy is null but the
    // window still shows days 10-12 (3,-,3) vs 13-15 (2,-,-) -> trend -1
    const { lifelog, checkins } = scenario(9);
    const s = state.estimateState({ lifelog, checkins, today: '2026-10-15' });
    assert.equal(s.energy, null);
    assert.equal(s.condTrend, -1);
    assert.equal(s.capacityBase, 30);
    assert.equal(s.capacityFactor, 1);
    assert.equal(s.capacityMin, 30);
    assert.deepEqual(s.capacityReasons, []);
  });

  test('trendFactor helper: <= -1 -> 0.8, otherwise 1, never throws', () => {
    assert.equal(state.TREND_FACTOR, 0.8);
    assert.equal(state.TREND_DOWN_THRESHOLD, -1);
    assert.deepEqual([-2, -1, -0.999, 0, 1.333].map(state.trendFactor), [0.8, 0.8, 1, 1, 1]);
    assert.equal(state.trendFactor(null), 1);
    assert.equal(state.trendFactor(undefined), 1);
    assert.equal(state.trendFactor('nope'), 1);
    assert.equal(state.trendFactor('-1'), 0.8);
  });
});

describe('showedUp and consistency7 (§4.2–4.3)', () => {
  test('inline fixture: showedUp counts logged days, consistency7 is the last 7 rows / 7', () => {
    const day11 = state.estimateState(scenario(11));
    assert.equal(day11.showedUp, 9);
    assert.equal(day11.consistency7, 0.86);
    const day14 = state.estimateState(scenario(14));
    assert.equal(day14.showedUp, 12);
    assert.equal(day14.consistency7, 1);
  });

  test('silent days lower consistency7 but never reset showedUp', () => {
    const { lifelog, checkins } = scenario(14);
    const s = state.estimateState({ lifelog, checkins, today: '2026-10-21' });
    assert.equal(s.showedUp, 12);
    // rows 10-15 .. 10-21: 10-15..10-18 logged, 10-19..10-21 silent -> 4/7
    assert.equal(s.consistency7, 0.57);
  });

  test('fewer than 7 rows still divides by 7', () => {
    const lifelog = [{ ...LABEL, id: 'l1', date: '2026-10-05', source: 'note', title: 'x', summary: 'y', tags: [], url: null }];
    const s = state.estimateState({ lifelog, checkins: [], today: '2026-10-06' });
    assert.equal(s.showedUp, 1);
    assert.equal(s.consistency7, 0.14);
  });

  test('dana-14d.json: day 11 -> showedUp 11, consistency7 1.0; day 14 -> 14, 1.0', () => {
    const day11 = state.estimateState({ lifelog: DANA.lifelog, checkins: DANA.checkins, today: DANA.expected.day11.date });
    assert.equal(day11.showedUp, 11);
    assert.equal(day11.consistency7, 1);
    assert.equal(day11.risk.level, 'amber');
    const day14 = state.estimateState({ lifelog: DANA.lifelog, checkins: DANA.checkins, today: DANA.expected.day14.date });
    assert.equal(day14.showedUp, 14);
    assert.equal(day14.consistency7, 1);
    assert.equal(day14.risk.level, 'green');
  });

  test('empty input -> showedUp 0, consistency7 0', () => {
    const s = state.estimateState({ lifelog: null, checkins: 'x', today: 42 });
    assert.equal(s.showedUp, 0);
    assert.equal(s.consistency7, 0);
    assert.equal(s.capacityFactor, 1);
    assert.deepEqual(s.capacityReasons, []);
  });
});

describe('energy is self-reported only', () => {
  test('no condition anywhere -> energy null, capacity 30, condition check skipped', () => {
    const lifelog = [{ ...LABEL, id: 'l1', date: '2026-10-05', source: 'note', title: 'x', summary: 'y', tags: [], url: null }];
    const s = state.estimateState({ lifelog, checkins: [{ actionId: 'a1', kind: 'done', day: 'Mon' }], today: '2026-10-05' });
    assert.equal(s.energy, null);
    assert.equal(s.energySource, null);
    assert.equal(s.capacityMin, 30);
    assert.equal(s.risk.checks.find((c) => c.rule === 'low_condition').status, 'skipped');
  });

  test('latest lifelog self-report wins over older ones and names its source', () => {
    const s = state.estimateState(scenario(9));
    assert.equal(s.energy, 2);
    assert.deepEqual(s.energySource, { type: 'lifelog', id: 'l09', date: '2026-10-13' });
  });

  test('a report from yesterday still counts; one older than that is not carried forward as today', () => {
    const { lifelog, checkins } = scenario(9);
    // day 9 (2026-10-13, condition 2) is the last report; today one day later -> still energy 2
    const next = state.estimateState({ lifelog, checkins, today: '2026-10-14' });
    assert.equal(next.energy, 2);
    assert.deepEqual(next.energySource, { type: 'lifelog', id: 'l09', date: '2026-10-13' });
    // two days later (and 38 days later): nothing is inferred -> null, capacity 30, check skipped
    for (const today of ['2026-10-15', '2026-11-20']) {
      const s = state.estimateState({ lifelog, checkins, today });
      assert.equal(s.energy, null, today);
      assert.equal(s.energySource, null);
      assert.equal(s.capacityMin, 30);
    }
    assert.equal(state.ENERGY_MAX_AGE_DAYS, 1);
  });
});

describe('momentum and self-efficacy EWMA', () => {
  test('one done day -> 0.65; a silent day after it -> 0.455', () => {
    const lifelog = [{ ...LABEL, id: 'l1', date: '2026-10-05', source: 'note', title: 'x', summary: 'y', tags: [], url: null }];
    const checkins = [{ actionId: 'a1', kind: 'done', day: 'Mon', date: '2026-10-05' }];
    assert.equal(state.estimateState({ lifelog, checkins, today: '2026-10-05' }).momentum, 0.65);
    assert.equal(state.estimateState({ lifelog, checkins, today: '2026-10-06' }).momentum, 0.455);
  });

  test('not_today then full done: SE 0.4 -> 0.52; micro done instead -> 0.57', () => {
    const base = [{ actionId: 'a1', kind: 'not_today', day: 'Wed', date: '2026-10-14' }];
    const full = [...base, { actionId: 'a1', kind: 'done', day: 'Thu', date: '2026-10-15', minutes: 25 }];
    const micro = [...base, { actionId: 'a1', kind: 'done', day: 'Thu', date: '2026-10-15', variant: 'micro' }];
    assert.equal(state.estimateState({ lifelog: [], checkins: full, today: '2026-10-15' }).selfEfficacy, 0.52);
    assert.equal(state.estimateState({ lifelog: [], checkins: micro, today: '2026-10-15' }).selfEfficacy, 0.57);
  });

  test('low momentum and first week fire on a sparse start', () => {
    const lifelog = [{ ...LABEL, id: 'l1', date: '2026-10-05', source: 'note', title: 'x', summary: 'y', tags: [], url: null }];
    const s = state.estimateState({ lifelog, checkins: [], today: '2026-10-08' });
    assert.equal(s.firstWeek, true);
    assert.ok(s.momentum < 0.35);
    assert.ok(s.risk.reasons.includes('low_momentum'));
    assert.ok(s.risk.reasons.includes('first_week'));
  });
});

describe('dates and check-in resolution', () => {
  test('weekday-only check-ins resolve to the latest matching date on or before today', () => {
    assert.equal(state.weekdayOf('2026-10-15'), 'Thu');
    assert.equal(state.resolveCheckinDate({ actionId: 'a2', kind: 'not_today', day: 'Thu' }, '2026-10-15'), '2026-10-15');
    assert.equal(state.resolveCheckinDate({ actionId: 'a2', kind: 'not_today', day: 'Tue' }, '2026-10-15'), '2026-10-13');
    assert.equal(state.resolveCheckinDate({ actionId: 'a2', kind: 'not_today', day: 'Fri' }, '2026-10-15'), '2026-10-09');
    assert.equal(state.resolveCheckinDate({ actionId: 'a2', kind: 'not_today', day: 'Fri' }, 'Thu'), null);
    const s = state.estimateState({ lifelog: [], checkins: [{ actionId: 'a2', kind: 'not_today', day: 'Thu' }], today: '2026-10-15' });
    assert.equal(s.features.find((f) => f.date === '2026-10-15').notToday, 1);
  });

  test('a weekday-only today falls back to the latest dated event', () => {
    const { lifelog, checkins } = scenario(14);
    const s = state.estimateState({ lifelog, checkins, today: 'Thu' });
    assert.equal(s.today, '2026-10-18');
    assert.equal(s.dataGapDays, 0);
  });

  test('daysBetween and dateOrdinal never throw on bad input', () => {
    assert.equal(state.daysBetween('2026-10-05', '2026-10-18'), 13);
    assert.equal(state.daysBetween('nope', '2026-10-18'), null);
    assert.equal(state.dateOrdinal(null), null);
    assert.equal(state.dateOrdinal('2026-13-45'), null);
  });
});

describe('purity', () => {
  test('same input -> same output; inputs are not mutated', () => {
    const input = scenario(11);
    const snapshot = JSON.stringify(input);
    const a = state.estimateState(input);
    const b = state.estimateState(input);
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(input), snapshot);
  });

  test('positional form matches the object form', () => {
    const { lifelog, checkins, today } = scenario(11);
    assert.deepEqual(state.estimateState(lifelog, checkins, today), state.estimateState({ lifelog, checkins, today }));
  });

  test('garbage input returns a usable state instead of throwing', () => {
    const s = state.estimateState({ lifelog: null, checkins: 'x', today: 42 });
    assert.equal(s.energy, null);
    assert.equal(s.momentum, 0.5);
    assert.equal(s.capacityMin, 30);
    assert.equal(s.dataGapDays, null);
    assert.deepEqual(s.features, []);
    assert.equal(s.risk.level, 'green');
  });
});
