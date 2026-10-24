// jobs.test.mjs — job-readiness score and stage gates (ALGORITHM_DESIGN §7.2–§7.3).
// Run from brain/: node --test tests/jobs.test.mjs   All fixtures are inline and synthetic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { readinessScore, stageLevel, nextGate, nextLevel, WEIGHTS, LEVELS, PROOF_TARGET, STAGE_THRESHOLDS } from '../jobs.js';
import { buildLedger } from '../evidence.js';
import { milestones, GATE_TEMPLATES } from '../goal.js';
import { estimateState } from '../state.js';
import { lint } from '../messages.js';
import { loadScenario } from '../index.js';

const FORBIDDEN = new RegExp(['Gem', 'ini'].join('') + '|' + ['제미', '나이'].join(''), 'i');
// The score describes proof and rhythm; it never promises an outcome.
const OUTCOME_CLAIM = /\b(hired|job offer|offer letter|guarantee|guaranteed|will get|you will land)\b/i;

const COMPONENTS = ['proof', 'skills', 'consistency', 'market', 'confidence'];
const PATH = { role_id: 'messaging-consultant', title: 'Messaging & Positioning Consultant', requires: ['discovery-call', 'positioning', 'case-studies', 'project-pricing'] };
const GOAL = { state: 'provisional', chosenPathId: 'messaging-consultant' };
const RANKED = [{ id: 'messaging-consultant', ratio: 0.75, transfers: ['discovery-call', 'positioning', 'case-studies'], missing: ['project-pricing'] }];

// n ledger entries with the given artifact types (default: portfolio pieces), one per day from Oct 6.
function entries(n, types = []) {
  return Array.from({ length: n }, (_, i) => ({
    id: `ev:a${(i % 3) + 1}@2026-10-${String(6 + i).padStart(2, '0')}`,
    date: `2026-10-${String(6 + i).padStart(2, '0')}`,
    actionId: `a${(i % 3) + 1}`,
    title: 'Write a before/after page',
    kind: 'done',
    artifactType: types[i] || 'portfolio_piece',
    gate: 'M1',
    skill: null,
    bullet: 'Wrote a before/after page.',
    evidence: [],
    scrubbed: false,
  }));
}

const ledgerOf = (n, types) => ({ entries: entries(n, types), count: n });

function gates(passedIds = []) {
  return milestones(PATH, '2026-10-05').map((gate) => (passedIds.includes(gate.id) ? { ...gate, passed: true } : gate));
}

// A feature table with `logged` days: one row per calendar day.
function features(days, loggedEvery = 1) {
  return Array.from({ length: days }, (_, i) => ({ date: `2026-10-${String(5 + i).padStart(2, '0')}`, logged: i % loggedEvery === 0 }));
}

function allStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allStrings(v, out));
  return out;
}

describe('readinessScore: bounds', () => {
  test('empty input -> score 0, every component 0, level explore, nothing thrown', () => {
    for (const input of [undefined, null, {}, { ledger: 'x', state: 1, goal: [] }]) {
      const out = readinessScore(input);
      assert.equal(out.score, 0);
      assert.deepEqual(out.components, { proof: 0, skills: 0, consistency: 0, market: 0, confidence: 0 });
      assert.equal(out.level, 'explore');
      assert.equal(out.next_gate.name, 'M1 Fit');
    }
  });

  test('components are integers in 0..20, weights sum to 100, score is their sum in 0..100', () => {
    assert.equal(Object.values(WEIGHTS).reduce((s, n) => s + n, 0), 100);
    const cases = [
      readinessScore({}),
      readinessScore({ ledger: ledgerOf(2), goal: GOAL, rankedRoles: RANKED, state: { selfEfficacy: 0.5, features: features(7) } }),
      readinessScore({ ledger: ledgerOf(9, ['conversation', 'outreach', 'application', 'pitch', 'feedback']), goal: GOAL, rankedRoles: [{ id: 'messaging-consultant', ratio: 1 }], state: { selfEfficacy: 1, features: features(14) }, milestones: gates(['M1', 'M2', 'M3']) }),
      readinessScore({ ledger: ledgerOf(50), goal: GOAL, path: { ...PATH, ratio: 5 }, state: { selfEfficacy: 7, features: features(14) }, market: { reachOuts: 99, applications: 99 } }),
    ];
    for (const out of cases) {
      for (const key of COMPONENTS) {
        assert.ok(Number.isInteger(out.components[key]), `${key} integer`);
        assert.ok(out.components[key] >= 0 && out.components[key] <= WEIGHTS[key], `${key} in range: ${out.components[key]}`);
      }
      assert.equal(out.score, Object.values(out.components).reduce((s, n) => s + n, 0));
      assert.ok(out.score >= 0 && out.score <= 100);
      assert.ok(LEVELS.includes(out.level));
    }
    assert.equal(cases[2].score, 100);
    assert.equal(cases[3].score, 100, 'over-range inputs clamp, they do not overflow');
  });

  test('proof: full steps count 1, micro steps count half, capped at the target', () => {
    const mixed = { entries: [...entries(2), { ...entries(1)[0], id: 'ev:m', kind: 'micro' }], count: 3 };
    const out = readinessScore({ ledger: mixed, goal: GOAL });
    assert.equal(out.components.proof, Math.round((2.5 / PROOF_TARGET) * WEIGHTS.proof));
    assert.ok(out.explain.includes(`proof:2.5/${PROOF_TARGET}`));
    assert.equal(readinessScore({ ledger: ledgerOf(12), goal: GOAL }).components.proof, WEIGHTS.proof);
  });

  test('skills: rankRoles ratio for the chosen path > path.ratio > requires ∩ knowHow; no path -> 0', () => {
    assert.equal(readinessScore({ goal: GOAL, rankedRoles: RANKED }).components.skills, 15);
    assert.equal(readinessScore({ goal: GOAL, path: { ...PATH, ratio: 0.5 } }).components.skills, 10);
    const person = { traits: { careerCapital: { knowHow: ['discovery-call', 'positioning'] } } };
    assert.equal(readinessScore({ goal: GOAL, path: PATH, person }).components.skills, 10);
    assert.equal(readinessScore({ goal: { state: 'ambiguous' }, rankedRoles: RANKED }).components.skills, 0);
    assert.ok(readinessScore({ goal: GOAL }).explain.includes('skills:unknown'));
  });

  test('consistency: showed-up days per week against the target; unknown without any day', () => {
    assert.equal(readinessScore({ state: { features: features(14) } }).components.consistency, WEIGHTS.consistency);
    assert.equal(readinessScore({ state: { features: features(14, 7) } }).components.consistency, 4); // 2 of 14 days -> 1/week -> 1/5
    assert.ok(readinessScore({ state: { features: [] } }).explain.includes('consistency:unknown'));
    // Without a feature table the ledger's own dates stand in.
    const out = readinessScore({ ledger: ledgerOf(7) });
    assert.equal(out.components.consistency, WEIGHTS.consistency);
  });

  test('market: reach-outs and applications from ledger types, or an explicit market input; else 0', () => {
    assert.equal(readinessScore({}).components.market, 0);
    assert.ok(readinessScore({}).explain.includes('market:none'));
    assert.equal(readinessScore({ ledger: ledgerOf(1, ['conversation']) }).components.market, 4);
    assert.equal(readinessScore({ ledger: ledgerOf(5, ['conversation', 'outreach', 'feedback', 'application', 'pitch']) }).components.market, 20);
    assert.equal(readinessScore({ market: { reachOuts: 2, applications: 0 } }).components.market, 8);
  });

  test('confidence: self-efficacy x 20; unknown when the state has no logged day', () => {
    assert.equal(readinessScore({ state: { selfEfficacy: 0.764, features: features(3) } }).components.confidence, 15);
    assert.equal(readinessScore({ state: { selfEfficacy: 0.5, features: [] } }).components.confidence, 0);
    assert.equal(readinessScore({ state: {} }).components.confidence, 0);
  });
});

describe('readinessScore: stage gates (§7.3)', () => {
  const base = { goal: GOAL, rankedRoles: RANKED, state: { selfEfficacy: 0.6, features: features(14) } };

  test('no path -> explore, whatever the ledger says', () => {
    assert.equal(readinessScore({ ...base, goal: { state: 'ambiguous' }, ledger: ledgerOf(9, ['application']), milestones: gates(['M1', 'M2', 'M3']) }).level, 'explore');
    assert.equal(readinessScore({ ledger: ledgerOf(9) }).level, 'explore');
    assert.deepEqual(readinessScore({}).next_level, { level: 'build-proof', missing: ['a chosen path'] });
  });

  test('path chosen with fewer than 3 entries -> build-proof', () => {
    for (const n of [0, 1, 2]) {
      const out = readinessScore({ ...base, ledger: ledgerOf(n), milestones: gates(['M1', 'M2']) });
      assert.equal(out.level, 'build-proof', `${n} entries`);
      assert.equal(out.next_level.level, 'reach-out');
      assert.ok(out.next_level.missing.some((m) => m.includes(`${STAGE_THRESHOLDS.reachOutEntries - n} more ledger`)));
    }
  });

  test('3+ entries AND M2 passed -> reach-out; 3+ entries without M2 stays build-proof', () => {
    const withM2 = readinessScore({ ...base, ledger: ledgerOf(3), milestones: gates(['M1', 'M2']) });
    assert.equal(withM2.level, 'reach-out');
    assert.ok(withM2.explain.includes('level:reach-out:entries>=3+M2_passed'));
    const withoutM2 = readinessScore({ ...base, ledger: ledgerOf(5), milestones: gates(['M1']) });
    assert.equal(withoutM2.level, 'build-proof');
    assert.ok(withoutM2.explain.includes('level:build-proof:M2_not_passed'));
    assert.deepEqual(withoutM2.next_level, { level: 'reach-out', missing: ['the M2 Proof gate passed, with your confirm'] });
  });

  test('M3 passed -> apply, even with few entries', () => {
    const out = readinessScore({ ...base, ledger: ledgerOf(1), milestones: gates(['M1', 'M2', 'M3']) });
    assert.equal(out.level, 'apply');
    assert.equal(out.next_level, null);
    assert.equal(out.next_gate.name, 'M4 Ready');
  });

  test('6+ entries with one reach-out logged -> apply; without any reach-out it is not', () => {
    const withReachOut = readinessScore({ ...base, ledger: ledgerOf(6, ['outreach']), milestones: gates([]) });
    assert.equal(withReachOut.level, 'apply');
    assert.ok(withReachOut.explain.includes('level:apply:entries>=6+reach_out'));
    const viaInput = readinessScore({ ...base, ledger: ledgerOf(6), market: { reachOuts: 0, applications: 1 }, milestones: gates([]) });
    assert.equal(viaInput.level, 'apply');
    const none = readinessScore({ ...base, ledger: ledgerOf(6), milestones: gates(['M1', 'M2']) });
    assert.equal(none.level, 'reach-out');
    assert.deepEqual(none.next_level.missing, ['one reach-out or application logged', 'or the M3 Market gate passed, with your confirm']);
    const five = readinessScore({ ...base, ledger: ledgerOf(5, ['outreach']), milestones: gates([]) });
    assert.equal(five.level, 'build-proof');
  });

  test('levels are monotone in evidence: adding entries, reach-outs or passed gates never lowers the level', () => {
    const order = (level) => LEVELS.indexOf(level);
    let previous = -1;
    const steps = [
      { ledger: ledgerOf(0) },
      { ledger: ledgerOf(2) },
      { ledger: ledgerOf(3), milestones: gates(['M1']) },
      { ledger: ledgerOf(3), milestones: gates(['M1', 'M2']) },
      { ledger: ledgerOf(6, ['outreach']), milestones: gates(['M1', 'M2']) },
      { ledger: ledgerOf(6, ['outreach']), milestones: gates(['M1', 'M2', 'M3']) },
    ];
    for (const step of steps) {
      const level = order(readinessScore({ ...base, ...step }).level);
      assert.ok(level >= previous, `level does not drop at ${JSON.stringify(step.ledger.count)}`);
      previous = level;
    }
    assert.equal(previous, order('apply'));
  });

  test('stageLevel: the rule name says which branch fired', () => {
    assert.equal(stageLevel({ chosenPathId: null, count: 9, gates: [], reachOuts: 9, applications: 9 }).level, 'explore');
    assert.equal(stageLevel({ chosenPathId: 'p', count: 2, gates: [], reachOuts: 0, applications: 0 }).rule, 'level:build-proof:entries<3');
    assert.equal(stageLevel({ chosenPathId: 'p', count: 3, gates: [{ id: 'M2', passed: true }], reachOuts: 0, applications: 0 }).level, 'reach-out');
    assert.equal(stageLevel({ chosenPathId: 'p', count: 3, gates: [{ id: 'M2', passed: 'yes' }], reachOuts: 0, applications: 0 }).level, 'build-proof', 'passed must be === true');
  });
});

describe('readinessScore: next gate', () => {
  test('first unpassed gate in M1..M4 order, with its criteria and what is missing', () => {
    const none = readinessScore({ goal: GOAL, ledger: ledgerOf(1) });
    assert.equal(none.next_gate.id, 'M1');
    assert.equal(none.next_gate.criteria, GATE_TEMPLATES[0].evidence);
    assert.deepEqual(none.next_gate.missing, ['1 more done step (1/2)', 'your own confirm that this gate is passed']);
    const two = readinessScore({ goal: GOAL, ledger: ledgerOf(2) });
    assert.deepEqual(two.next_gate.missing, ['your own confirm that this gate is passed'], 'enough steps, confirm still required (§6.4)');
    const m3 = readinessScore({ goal: GOAL, ledger: ledgerOf(6), milestones: gates(['M1', 'M2']) });
    assert.equal(m3.next_gate.name, 'M3 Market');
    assert.equal(m3.next_gate.date, '2026-12-07');
    assert.deepEqual(m3.next_gate.missing, ['3 more done steps (6/9)', 'your own confirm that this gate is passed']);
  });

  test('a gate evaluation attached by think() is used as is', () => {
    const evaluated = gates([]).map((g) => (g.id === 'M1' ? { ...g, evaluation: { passed: false, done: 0, required: 2, confirmed: false, reasons: ['done_below_minimum', 'not_confirmed'] } } : g));
    const out = readinessScore({ goal: GOAL, ledger: ledgerOf(5), milestones: evaluated });
    assert.deepEqual(out.next_gate.missing, ['2 more done steps (0/2)', 'your own confirm that this gate is passed']);
  });

  test('all four gates passed -> no next gate, level apply, next_level null', () => {
    const out = readinessScore({ goal: GOAL, milestones: gates(['M1', 'M2', 'M3', 'M4']) });
    assert.deepEqual(out.next_gate, { name: null, id: null, week: null, date: null, criteria: 'All four gates passed.', missing: [] });
    assert.equal(out.level, 'apply');
    assert.equal(out.next_level, null);
    assert.deepEqual(out.counts.gatesPassed, ['M1', 'M2', 'M3', 'M4']);
  });

  test('milestones can also come from goal.milestones', () => {
    const out = readinessScore({ goal: { ...GOAL, milestones: gates(['M1']) }, ledger: ledgerOf(3) });
    assert.equal(out.next_gate.id, 'M2');
    assert.equal(nextGate({ gates: [], count: 0 }).id, 'M1');
    assert.equal(nextLevel({ level: 'apply', count: 0, gates: [], reachOuts: 0, applications: 0 }), null);
  });
});

describe('readinessScore: language, explain, determinism', () => {
  const input = { ledger: ledgerOf(4, ['conversation']), goal: GOAL, rankedRoles: RANKED, state: { selfEfficacy: 0.7, features: features(10) }, milestones: gates(['M1']) };

  test('explain names one rule per component plus the level rule', () => {
    const out = readinessScore(input);
    assert.equal(out.explain.length, 6);
    for (const key of COMPONENTS) assert.ok(out.explain.some((r) => r.startsWith(`${key}:`)), key);
    assert.ok(out.explain[5].startsWith('level:'));
  });

  test('weights are exposed as design priors with the (확인 필요) marker', () => {
    const out = readinessScore(input);
    for (const key of COMPONENTS) assert.equal(out.weights[key], WEIGHTS[key]);
    assert.match(out.weights.note, /확인 필요/);
  });

  test('no outcome claim, no banned phrase, no vendor word in any string of the output', () => {
    const outputs = [readinessScore(input), readinessScore({}), readinessScore({ goal: GOAL, milestones: gates(['M1', 'M2', 'M3', 'M4']) })];
    for (const out of outputs) {
      const text = allStrings(out).join('\n');
      assert.ok(!OUTCOME_CLAIM.test(text), text.match(OUTCOME_CLAIM)?.[0]);
      assert.ok(!FORBIDDEN.test(text));
      assert.equal(lint(text).ok, true, lint(text).hits.join(', '));
    }
  });

  test('same input -> same output; input not mutated', () => {
    const before = JSON.stringify(input);
    assert.deepEqual(readinessScore(input), readinessScore(structuredClone(input)));
    assert.equal(JSON.stringify(input), before);
  });
});

describe('readinessScore: synthetic Dana scenario end to end', () => {
  const scenario = loadScenario();
  const lifelog = scenario.lifelog.filter((item) => ['note', 'saved_link', 'calendar'].includes(item.source));
  const ledger = buildLedger({ week: scenario.week, checkins: scenario.checkins, lifelog, path: scenario.path, today: scenario.today, arcStart: scenario.arc_start, skills: scenario.skills });
  const state = estimateState({ lifelog, checkins: scenario.checkins, today: scenario.today, arcStart: scenario.arc_start });
  const goal = { state: 'provisional', chosenPathId: scenario.path.role_id };
  const ranked = [{ id: scenario.path.role_id, ratio: 0.83 }];

  test('day 14 without a confirmed gate: build-proof, six entries, next gate M1 waits on the confirm', () => {
    const out = readinessScore({ ledger, state, goal, milestones: milestones(scenario.path, scenario.arc_start), rankedRoles: ranked });
    assert.equal(out.level, 'build-proof');
    assert.equal(out.counts.entries, 6);
    assert.equal(out.components.market, 0, 'no reach-out among the check-ins -> market stays 0');
    assert.equal(out.components.consistency, WEIGHTS.consistency);
    assert.ok(out.score > 0 && out.score <= 100);
    assert.equal(out.next_gate.id, 'M1');
    assert.deepEqual(out.next_gate.missing, ['your own confirm that this gate is passed']);
  });

  test('day 14 with M1 and M2 confirmed: reach-out, next gate M3', () => {
    const confirmed = milestones(scenario.path, scenario.arc_start).map((g) => (['M1', 'M2'].includes(g.id) ? { ...g, passed: true } : g));
    const out = readinessScore({ ledger, state, goal, milestones: confirmed, rankedRoles: ranked });
    assert.equal(out.level, 'reach-out');
    assert.equal(out.next_gate.id, 'M3');
    assert.deepEqual(out.next_level.missing, ['one reach-out or application logged', 'or the M3 Market gate passed, with your confirm']);
  });
});
