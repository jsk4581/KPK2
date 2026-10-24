// testset.test.mjs — freezes the story each [SIMULATION] scenario is meant to tell.
// Rebuilds the analysis from the brain modules, then checks the outcomes, not the numbers' decimals.
// Run: node --test testset/lifelog/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

execFileSync(process.execPath, [new URL('./build.mjs', import.meta.url).pathname], { stdio: 'pipe' });
const load = (id) => JSON.parse(readFileSync(new URL(`./out/${id}.analysis.json`, import.meta.url), 'utf8'));
const day = (a, date) => a.monitoring.timeline.find((t) => t.date === date);
const review = (a, week) => a.monitoring.weekly_reviews.find((r) => r.week === week);

const marco = load('marco-translator');
const priya = load('priya-contentwriter');
const riley = load('riley-illustrator');

test('every output is labelled synthetic and every message passes the tone lint', () => {
  for (const a of [marco, priya, riley]) {
    assert.equal(a._label, 'synthetic');
    for (const t of a.monitoring.timeline) assert.deepEqual(t.message_lint, [], `${a.id} ${t.date}`);
  }
});

test('L2 filter drops noise items before the ontology', () => {
  for (const a of [marco, priya, riley]) {
    assert.ok(a.ontology.l2_filter.filtered.length >= 1, a.id);
    const eventIds = a.ontology.nodes.filter((n) => n.type === 'LifeEvent').map((n) => n.id);
    for (const f of a.ontology.l2_filter.filtered) assert.ok(!eventIds.includes(`event:${f.id}`));
  }
});

test('reading about a skill is interest, not skill (saved links and pull notes)', () => {
  const ux = priya.ontology.roles.find((r) => r.id === 'ux-writer');
  assert.ok(ux.missing.includes('user-research'));
  assert.ok(priya.ontology.interests.includes('user-research'));
  const board = riley.ontology.roles.find((r) => r.id === 'storyboard-narrative-designer');
  assert.deepEqual(board.missing, ['shot-composition', 'animatic-editing']);
});

test('the ontology grows: chosen role overlap rises from arc start to today', () => {
  for (const a of [marco, priya, riley]) {
    const chosen = a.ontology.roles.find((r) => r.id === a.guide.path.id);
    assert.ok(chosen.overlap_now > chosen.overlap_start, a.id);
  }
});

test('Marco: steady weeks, gate M1 passes with evidence, waiting on a person is the constraint', () => {
  assert.equal(marco.person.archetype, 'pivot-with-runway');
  assert.ok(marco.monitoring.timeline.every((t) => t.risk.level === 'green'));
  assert.equal(day(marco, '2026-10-13').intervention.messageKey, 'GATE_PASS');
  assert.equal(marco.guide.goal_state, 'validated');
  assert.equal(marco.guide.next_gate.id, 'M2');
  assert.equal(marco.state_today.constraint, 'opportunity-social');
  assert.equal(day(marco, '2026-10-16').intervention.kind, 'comeback');
  assert.ok(marco.monitoring.weekly_reviews.every((r) => r.resize.direction === 'up'));
  assert.equal(marco.guide.goal_recheck.ask, false);
});

test('Priya: over-planned week shrinks, income pressure caps at two steps, time is the constraint', () => {
  assert.equal(priya.person.archetype, 'income-pressure');
  assert.equal(day(priya, '2026-09-29').intervention.kind, 'shrink');
  assert.equal(review(priya, 1).replanQuestion, 'Is this the wrong step, or the wrong size?');
  assert.ok(priya.monitoring.weekly_reviews.every((r) => r.resize.count <= 2));
  assert.equal(priya.state_today.constraint, 'opportunity-time');
});

test('Priya: market drift on the chosen role plus a better dream fit asks a question, never auto-switches', () => {
  assert.equal(priya.monitoring.market_drift.flag, true);
  assert.ok(priya.monitoring.market_drift.pct <= -15);
  const r = priya.guide.goal_recheck;
  assert.equal(r.ask, true);
  assert.equal(r.candidate, 'ux-writer');
  assert.equal(r.auto_change, false);
  assert.equal(priya.guide.path.id, 'ai-content-editor');
});

test('Riley: a step that keeps moving gets the replan question', () => {
  assert.equal(riley.person.archetype, 'identity-grief');
  assert.equal(review(riley, 1).replanQuestion, 'Is this the wrong step, or the wrong size?');
  assert.equal(day(riley, '2026-10-03').intervention.messageKey, 'CARRIED');
});

test('Riley: four silent days trigger reconnect, risk goes red, then recovers', () => {
  assert.equal(day(riley, '2026-10-10').intervention.kind, 'reconnect');
  assert.equal(day(riley, '2026-10-10').risk.level, 'red');
  assert.equal(review(riley, 2).resize.micro, true);
  assert.equal(day(riley, '2026-10-18').risk.level, 'green');
});

test('Riley: two low weeks escalate to a person even though the daily risk is green', () => {
  const last = review(riley, 3);
  assert.equal(last.escalate.reason, 'low_condition_10_of_14');
  assert.equal(last.resize.count, 1);
  assert.equal(riley.state_today.risk, 'green');
});
