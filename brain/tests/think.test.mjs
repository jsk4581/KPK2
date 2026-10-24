// think.test.mjs — the whole brain in one call, on the synthetic 14-day Dana scenario.
// Day 11 (2026-10-15, Thu) is the dip: amber risk, shrink/rest. Day 14 (2026-10-18, Sun) is the
// recovery: green risk, a full step. Everything asserted here is computed from brain/data/dana-14d.json.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { applyCheckin } from '../../app/logic.js';
import { think, rankRoles, planWeek, checkIn, analyzeState, explain, loadScenario, DEFAULT_SOURCES } from '../index.js';
import { checkinId } from '../state.js';
import { lint } from '../messages.js';

const scenario = loadScenario();
const DAY11 = scenario.expected.day11.date;
const DAY14 = scenario.expected.day14.date;
const WEEK2_START = '2026-10-12';

// The vendor word must never appear in any output; the regex is assembled so it is not written here.
const FORBIDDEN = new RegExp(['Gem', 'ini'].join('') + '|' + ['제미', '나이'].join(''), 'i');

// Scenario as the screen would hold it on `date`: lifelog and check-ins up to that day, today = date,
// and the week replayed through Build's applyCheckin for the check-ins of the current week.
function sliceAt(date) {
  const lifelog = scenario.lifelog.filter((item) => item.date <= date);
  const checkins = scenario.checkins.filter((c) => c.date <= date);
  let week = structuredClone(scenario.week);
  for (const c of checkins.filter((c) => c.date >= WEEK2_START)) {
    const result = applyCheckin(week, c.actionId, c.kind, c.day);
    assert.equal(result.ok, true, `replay ${c.actionId} ${c.kind} ${c.day}`);
    week = result.week;
  }
  return { fields: scenario.fields, path: scenario.path, week, lifelog, checkins, today: date, arcStart: scenario.arc_start };
}

function collectText(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectText(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectText(v, out));
  return out;
}

describe('think: day 11 (dip)', () => {
  const report = think(sliceAt(DAY11));

  test('risk is amber with the scenario reasons', () => {
    assert.equal(report.state.risk.level, scenario.expected.day11.riskLevel);
    assert.deepEqual(report.state.risk.reasons, scenario.expected.day11.reasons);
    assert.equal(report.state.energy, 2);
  });

  test('intervention is shrink or rest with two choices and a lint-clean message', () => {
    assert.ok(['shrink', 'rest'].includes(report.intervention.kind), report.intervention.kind);
    assert.equal(report.intervention.choices.length, 2);
    assert.equal(report.intervention.lead, 'rest_first');
    assert.ok(report.intervention.minutes <= 10);
    assert.equal(report.intervention.message.lint.ok, true);
    assert.equal(lint(report.intervention.message.text).ok, true);
  });

  test('root constraint matches the scenario', () => {
    assert.equal(report.constraint.constraint, scenario.expected.rootConstraint);
    assert.ok(report.constraint.evidence.length > 0);
  });

  test('monitor sees the repeated move and asks the one replanning question', () => {
    assert.ok(report.monitor.drift.some((d) => d.type === 'repeated_move' && d.actionId === 'a1'));
    assert.equal(report.monitor.review.replanQuestion, 'Is this the wrong step, or the wrong size?');
    assert.equal(report.monitor.review.escalate, null);
  });
});

describe('think: day 14 (recovery)', () => {
  const report = think(scenario);

  test('risk is green and the step is full (or a comeback)', () => {
    assert.equal(report.state.risk.level, scenario.expected.day14.riskLevel);
    assert.ok(['full', 'comeback'].includes(report.intervention.kind), report.intervention.kind);
    assert.equal(report.intervention.choices.length, 2);
    assert.equal(report.intervention.message.lint.ok, true);
  });

  test('root constraint matches the scenario', () => {
    assert.equal(report.constraint.constraint, scenario.expected.rootConstraint);
  });

  test('goal: path chosen but no gate confirmed -> provisional, never validated by itself', () => {
    assert.equal(report.goal.state, 'provisional');
    assert.equal(report.goal.chosenPathId, scenario.path.role_id);
    assert.equal(report.goal.milestones.length, 4);
    assert.deepEqual(report.goal.milestones.map((g) => g.id), ['M1', 'M2', 'M3', 'M4']);
    assert.ok(report.goal.milestones.every((g) => g.passed === false));
    assert.ok(report.goal.milestones[0].evaluation.reasons.includes('not_confirmed'));
    assert.equal(report.goal.milestones[0].date, '2026-10-19');
    assert.equal(typeof report.goal.nextQuestion.question, 'string');
  });

  test('gate passes only with evidence AND the user confirm flag', () => {
    const confirmed = think({ ...scenario, confirmedGates: ['M1'] });
    assert.equal(confirmed.goal.milestones[0].passed, true);
    assert.equal(confirmed.goal.state, 'validated');
    assert.equal(confirmed.intervention.kind, 'gate');
    assert.equal(confirmed.intervention.messageKey, 'GATE_PASS');
    assert.equal(confirmed.intervention.message.lint.ok, true);
  });

  test('person model and Build ranking agree with the scenario', () => {
    assert.equal(report.person.traits.archetype, 'identity-grief');
    assert.equal(report.person.traits.stageOfChange, 'action');
    assert.equal(report.context.rankedRoles[0].id, scenario.roles[0].id);
    assert.deepEqual(report.context.enabledSources, DEFAULT_SOURCES);
    assert.ok(report.person.evidence.every((id) => scenario.lifelog.some((item) => item.id === id)));
  });

  test('trace has the logic.withTrace shape and starts with Build functions', () => {
    for (const entry of report.trace) {
      assert.deepEqual(Object.keys(entry).sort(), ['fn', 'input', 'output', 'via']);
      assert.ok(['logic', 'brain'].includes(entry.via));
    }
    assert.deepEqual(report.trace.slice(0, 3).map((t) => t.fn), ['summarizeLifelog', 'extractSkills', 'rankRoles']);
    assert.ok(report.trace.slice(0, 3).every((t) => t.via === 'logic'));
  });
});

describe('think: invariants', () => {
  test('deterministic: same input -> deep-equal output, input not mutated', () => {
    const input = sliceAt(DAY11);
    const frozen = JSON.stringify(input);
    const a = think(input);
    const b = think(JSON.parse(frozen));
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(input), frozen);
    assert.deepEqual(think(scenario), think(scenario));
  });

  test('explain cites only ids and dates that exist in the input', () => {
    for (const input of [sliceAt(DAY11), scenario]) {
      const report = think(input);
      const lifelogIds = new Set(input.lifelog.map((i) => i.id));
      const checkinIds = new Set(input.checkins.map(checkinId));
      const featureDates = new Set(report.state.features.map((f) => f.date));
      assert.ok(report.explain.evidence.length > 0);
      for (const e of report.explain.evidence) {
        if (e.type === 'lifelog') assert.ok(lifelogIds.has(e.id), `lifelog ${e.id}`);
        else if (e.type === 'checkin') assert.ok(checkinIds.has(e.id), `checkin ${e.id}`);
        else if (e.type === 'feature') assert.ok(featureDates.has(e.date), `feature ${e.date}`);
        else assert.fail(`unknown evidence type ${e.type}`);
      }
      assert.ok(report.explain.rules.includes(`constraint:${report.constraint.constraint}`));
      assert.equal(lint(report.explain.text).ok, true);
    }
  });

  test('every sentence passes lint and no forbidden vendor word appears anywhere', () => {
    for (const input of [sliceAt(DAY11), scenario]) {
      const report = think(input);
      const message = report.intervention.message;
      assert.equal(lint([message.ack, message.reframe, message.next]).ok, true);
      assert.ok(!message.text.includes('undefined'));
      const texts = collectText({ message, question: report.goal.nextQuestion, review: report.monitor.review, explain: report.explain.text });
      for (const text of texts) assert.doesNotMatch(text, FORBIDDEN);
    }
  });

  test('never throws: skipped checks are reported, unknowns stay unknown', () => {
    for (const input of [undefined, null, {}, { today: 'Thu' }, { lifelog: 'x', checkins: 42, week: [] }]) {
      const report = think(input);
      assert.equal(report.intervention.kind, 'none');
      assert.equal(report.constraint.constraint, 'unknown');
      assert.equal(report.goal.state, 'ambiguous');
      assert.equal(report.person.traits.archetype, 'unknown');
      assert.equal(report.state.energy, null);
      assert.ok(report.state.risk.checks.some((c) => c.status === 'skipped'));
      assert.equal(report.intervention.message.lint.ok, true);
    }
  });

  test('disabled sources never reach the brain', () => {
    const report = think({ ...scenario, enabledSources: ['sms', 'messenger'] });
    const allowed = new Set(['sms', 'messenger']);
    const used = new Set(report.state.features.flatMap((f) => f.lifelogIds));
    for (const id of used) assert.ok(allowed.has(scenario.lifelog.find((i) => i.id === id).source));
    assert.equal(report.context.lifelogCount, scenario.lifelog.filter((i) => allowed.has(i.source)).length);
  });

  test('week is built from the path when the screen passes none', () => {
    const report = think({ ...scenario, week: undefined });
    assert.equal(report.context.week.actions.length, 3);
    assert.equal(report.context.week.pathId, scenario.path.role_id);
    assert.ok(report.trace.some((t) => t.fn === 'buildWeek' && t.via === 'logic'));
  });
});

describe('the smaller tools', () => {
  test('rankRoles: Build ranking on the scenario, top role is the chosen path', () => {
    const out = rankRoles({ fields: scenario.fields, lifelog: scenario.lifelog });
    assert.equal(out.roles.length, 3);
    assert.equal(out.roles[0].id, scenario.roles[0].id);
    assert.ok(out.skillIds.length > 0);
    const given = rankRoles({ userSkillIds: ['ux-writing', 'copy-editing', 'ux-writing'] });
    assert.deepEqual(given.skillIds, ['copy-editing', 'ux-writing']);
    assert.equal(given.roles[0].id, 'ux-writer');
  });

  test('planWeek: buildWeek + sizeForCondition; a path without actions borrows the fallback draft', () => {
    const out = planWeek({ path: scenario.path, today: '2026-10-12', condition: 2 });
    assert.equal(out.today, 'Mon');
    assert.deepEqual(out.week.actions.map((a) => a.id), ['a1', 'a2', 'a3']);
    assert.ok(out.week.actions.every((a) => a.minutes <= 30 && a.status === 'todo'));
    assert.ok(out.view.every((a) => a.reduced === true && a.minutes <= 10));
    assert.equal(planWeek({ path: scenario.path, today: 'Sun' }).view[0].reduced, false);
  });

  test('checkIn: not today moves the step, appends the record and re-runs think', () => {
    const base = { week: scenario.week, checkins: scenario.checkins.slice(0, 3), lifelog: scenario.lifelog.filter((i) => i.date <= '2026-10-13'), fields: scenario.fields, path: scenario.path };
    const moved = checkIn({ ...base, actionId: 'a1', kind: 'not_today', today: '2026-10-13', reason: 'energy' });
    assert.equal(moved.ok, true);
    assert.equal(moved.adjustment.toDay, 'Wed');
    assert.equal(moved.week.actions[0].status, 'moved');
    assert.equal(moved.checkins.length, 4);
    assert.deepEqual(moved.checkins[3], { actionId: 'a1', kind: 'not_today', day: 'Tue', date: '2026-10-13', blocker_reason: 'energy' });
    assert.equal(moved.brain.constraint.constraint, 'motivation-automatic');
    assert.equal(moved.brain.context.week.actions[0].day, 'Wed');
    assert.equal(moved.brain.intervention.message.lint.ok, true);

    const refused = checkIn({ ...base, actionId: 'zz', kind: 'done', today: 'Tue' });
    assert.equal(refused.ok, false);
    assert.equal(refused.reason, 'unknown-action');
    assert.equal(refused.brain, null);
  });

  test('checkIn: an unknown today is refused by Build (invalid-today), never filled in from week.today', () => {
    for (const today of ['Funday', '', undefined, null, '2026-13-45', 'monday']) {
      const out = checkIn({ week: scenario.week, actionId: 'a1', kind: 'not_today', today, checkins: [] });
      assert.equal(out.ok, false, `today=${String(today)}`);
      assert.equal(out.reason, 'invalid-today');
      assert.deepEqual(out.week, scenario.week);
      assert.equal(out.brain, null);
    }
    assert.equal(checkIn({ week: scenario.week, actionId: 'a1', kind: 'not_today', today: '2026-10-13', checkins: [] }).adjustment.toDay, 'Wed');
  });

  test('analyzeState equals the state inside think', () => {
    const input = sliceAt(DAY11);
    assert.deepEqual(analyzeState(input), think(input).state);
    assert.equal(analyzeState({ lifelog: scenario.lifelog, checkins: scenario.checkins, today: DAY14 }).risk.level, 'green');
  });

  test('explain: without a decision it is think().explain; with a report it explains that decision', () => {
    const input = sliceAt(DAY11);
    const report = think(input);
    assert.deepEqual(explain(input), report.explain);
    assert.deepEqual(explain({ ...input, decision: report }), report.explain);
    const bare = explain({ ...input, decision: { kind: 'full', actionId: 'a2', minutes: 30, messageKey: 'FULL', reasons: ['capacity_ok'] } });
    assert.ok(bare.text.startsWith('full a2 (30 min) -> FULL'));
    assert.ok(bare.rules.includes('risk:consec_rest'));
  });
});
