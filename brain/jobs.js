// jobs.js — Decision Brain "success -> work": job-readiness score and stage gate
// (ALGORITHM_DESIGN §7.2–§7.3). Pure and deterministic: no DOM, no network, no clock.
// Every weight and threshold here is a design prior (확인 필요): the five components are scored
// 0–20 each and summed to 0–100 so the split is readable, not because the data has validated it.
// The result never claims an outcome. It says how much proof, overlap, rhythm, market contact and
// self-efficacy the log shows, which stage that puts the plan in, and what the next gate still needs.

import { GATE_TEMPLATES } from './goal.js';
import { isIsoDate, daysBetween } from './state.js';

export const LEVELS = ['explore', 'build-proof', 'reach-out', 'apply'];

// Design priors (확인 필요). Each component maps to 0–WEIGHT; the sum is the 0–100 score.
export const WEIGHTS = { proof: 20, skills: 20, consistency: 20, market: 20, confidence: 20 };
export const PROOF_TARGET = 6; // full-step equivalents for a full proof score = M2 Proof minDone
export const MICRO_PROOF_WEIGHT = 0.5; // a flagged micro step counts half toward proof
export const CONSISTENCY_TARGET_DAYS_PER_WEEK = 5; // five showed-up days a week = full consistency
export const MARKET_POINTS = { reachOut: 4, maxReachOuts: 3, application: 4, maxApplications: 2 }; // 3 reach-outs + 2 applications = 20
export const REACH_OUT_TYPES = ['outreach', 'conversation', 'feedback'];
export const APPLICATION_TYPES = ['application', 'pitch'];

// Stage gates (§7.3 as specified for this build). Checked top-down; the highest rule that holds wins.
export const STAGE_THRESHOLDS = { reachOutEntries: 3, applyEntries: 6 };
export const STAGE_RULES = {
  explore: 'no path chosen',
  'build-proof': 'path chosen and fewer than 3 ledger entries, or the M2 Proof gate not yet passed',
  'reach-out': '3 or more ledger entries and the M2 Proof gate passed',
  apply: 'the M3 Market gate passed, or 6 or more ledger entries and at least one reach-out or application logged',
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const finite = (value) => (value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value));
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const round3 = (n) => Math.round((n + Number.EPSILON) * 1000) / 1000;

function scaled(ratio, weight) {
  return Math.round(clamp(ratio, 0, 1) * weight);
}

// ---------- inputs ----------

function chosenPathIdOf(goal, path) {
  const g = asObject(goal);
  if (g.state === 'ambiguous') return null;
  return asText(g.chosenPathId) || asText(asObject(path).role_id || asObject(path).id) || null;
}

function gatesOf(milestones, goal) {
  const given = asArray(milestones).filter((g) => g && typeof g === 'object');
  if (given.length > 0) return given;
  return asArray(asObject(goal).milestones).filter((g) => g && typeof g === 'object');
}

const gatePassed = (gates, id) => gates.some((gate) => asText(gate.id) === id && gate.passed === true);

// ---------- components ----------

function proofComponent(entries) {
  const full = entries.filter((e) => e.kind !== 'micro').length;
  const micro = entries.length - full;
  const equivalent = full + MICRO_PROOF_WEIGHT * micro;
  const value = scaled(equivalent / PROOF_TARGET, WEIGHTS.proof);
  return { value, rule: `proof:${equivalent}/${PROOF_TARGET}`, full, micro };
}

// Overlap ratio of the chosen path: rankRoles entry for the path > path.ratio > |requires ∩ knowHow| / |requires|.
function skillsComponent({ chosenPathId, rankedRoles, path, person }) {
  if (!chosenPathId) return { value: 0, rule: 'skills:no_path', ratio: null };
  const role = asArray(rankedRoles).find((r) => r && asText(r.id || r.role_id) === chosenPathId);
  let ratio = finite(role && role.ratio);
  if (ratio === null) ratio = finite(asObject(path).ratio);
  if (ratio === null) {
    const requires = asArray(asObject(path).requires).map(asText).filter(Boolean);
    const knowHow = new Set(asArray(asObject(asObject(asObject(person).traits).careerCapital).knowHow).map(asText));
    if (requires.length > 0) ratio = requires.filter((id) => knowHow.has(id)).length / requires.length;
  }
  if (ratio === null) return { value: 0, rule: 'skills:unknown', ratio: null };
  return { value: scaled(ratio, WEIGHTS.skills), rule: `skills:ratio=${round3(ratio)}`, ratio: round3(ratio) };
}

// Showed-up days per week over the state's feature table (one row per calendar day); without it,
// the distinct dates of the ledger entries.
function consistencyComponent({ state, entries }) {
  const features = asArray(asObject(state).features).filter((f) => f && typeof f === 'object');
  let showedUp;
  let days;
  if (features.length > 0) {
    showedUp = features.filter((f) => f.logged === true).length;
    days = features.length;
  } else {
    const sorted = [...new Set(entries.map((e) => e.date).filter(isIsoDate))].sort();
    showedUp = sorted.length;
    days = sorted.length > 0 ? daysBetween(sorted[0], sorted[sorted.length - 1]) + 1 : 0;
  }
  if (days === 0) return { value: 0, rule: 'consistency:unknown', showedUp: 0, weeks: 0 };
  const weeks = Math.max(1, Math.ceil(days / 7));
  const perWeek = showedUp / weeks;
  return {
    value: scaled(perWeek / CONSISTENCY_TARGET_DAYS_PER_WEEK, WEIGHTS.consistency),
    rule: `consistency:${showedUp}d/${weeks}w`,
    showedUp,
    weeks,
  };
}

// Reach-outs and applications: an explicit `market` input wins; otherwise ledger artifact types.
function marketComponent({ market, entries }) {
  const given = asObject(market);
  const reachOuts = finite(given.reachOuts) ?? entries.filter((e) => REACH_OUT_TYPES.includes(e.artifactType)).length;
  const applications = finite(given.applications) ?? entries.filter((e) => APPLICATION_TYPES.includes(e.artifactType)).length;
  const points = MARKET_POINTS.reachOut * Math.min(MARKET_POINTS.maxReachOuts, reachOuts)
    + MARKET_POINTS.application * Math.min(MARKET_POINTS.maxApplications, applications);
  const value = Math.round(clamp(points, 0, WEIGHTS.market));
  const rule = reachOuts + applications === 0 ? 'market:none' : `market:reach_outs=${reachOuts},applications=${applications}`;
  return { value, rule, reachOuts, applications };
}

// Self-efficacy from the state. A feature table that exists but is empty means no day was logged:
// the EWMA start value is not evidence, so confidence stays unknown (0).
function confidenceComponent(state) {
  const s = asObject(state);
  const se = Array.isArray(s.features) && s.features.length === 0 ? null : finite(s.selfEfficacy);
  if (se === null) return { value: 0, rule: 'confidence:unknown', selfEfficacy: null };
  return { value: scaled(se, WEIGHTS.confidence), rule: `confidence:se=${round3(se)}`, selfEfficacy: round3(se) };
}

// ---------- stage ----------

export function stageLevel({ chosenPathId, count, gates, reachOuts, applications }) {
  if (!chosenPathId) return { level: 'explore', rule: 'level:explore:no_path' };
  if (gatePassed(gates, 'M3')) return { level: 'apply', rule: 'level:apply:M3_passed' };
  if (count >= STAGE_THRESHOLDS.applyEntries && reachOuts + applications >= 1) return { level: 'apply', rule: `level:apply:entries>=${STAGE_THRESHOLDS.applyEntries}+reach_out` };
  if (count >= STAGE_THRESHOLDS.reachOutEntries && gatePassed(gates, 'M2')) return { level: 'reach-out', rule: `level:reach-out:entries>=${STAGE_THRESHOLDS.reachOutEntries}+M2_passed` };
  if (count < STAGE_THRESHOLDS.reachOutEntries) return { level: 'build-proof', rule: `level:build-proof:entries<${STAGE_THRESHOLDS.reachOutEntries}` };
  return { level: 'build-proof', rule: 'level:build-proof:M2_not_passed' };
}

// First unpassed gate with what it still needs. `missing` is built from the gate's own evaluation
// when think() attached one, else from the ledger count against the gate's minDone; the user's own
// confirm is always listed until the gate is passed (§6.4: nothing passes automatically).
export function nextGate({ gates, count }) {
  const ordered = GATE_TEMPLATES.map((template) => gates.find((g) => asText(g.id) === template.id) || template);
  const gate = ordered.find((g) => g.passed !== true);
  if (!gate) return { name: null, id: null, week: null, date: null, criteria: 'All four gates passed.', missing: [] };
  const template = GATE_TEMPLATES.find((t) => t.id === asText(gate.id)) || GATE_TEMPLATES[0];
  const missing = [];
  const evaluation = asObject(gate.evaluation);
  const required = finite(evaluation.required) ?? finite(gate.minDone) ?? template.minDone;
  const done = finite(evaluation.done) ?? count;
  if (done < required) missing.push(`${required - done} more done ${required - done === 1 ? 'step' : 'steps'} (${done}/${required})`);
  missing.push('your own confirm that this gate is passed');
  return {
    name: [template.id, template.name].join(' '),
    id: template.id,
    week: finite(gate.week) ?? template.week,
    date: gate.date || null,
    criteria: asText(gate.evidence) || template.evidence,
    missing,
  };
}

// The next stage and what separates the plan from it (§7.3 as specified). Null at 'apply'.
export function nextLevel({ level, count, gates, reachOuts, applications }) {
  const entries = (n) => `${n} more ledger ${n === 1 ? 'entry' : 'entries'}`;
  if (level === 'explore') return { level: 'build-proof', missing: ['a chosen path'] };
  if (level === 'build-proof') {
    const missing = [];
    if (count < STAGE_THRESHOLDS.reachOutEntries) missing.push(entries(STAGE_THRESHOLDS.reachOutEntries - count));
    if (!gatePassed(gates, 'M2')) missing.push('the M2 Proof gate passed, with your confirm');
    return { level: 'reach-out', missing };
  }
  if (level === 'reach-out') {
    const missing = [];
    if (count < STAGE_THRESHOLDS.applyEntries) missing.push(entries(STAGE_THRESHOLDS.applyEntries - count));
    if (reachOuts + applications === 0) missing.push('one reach-out or application logged');
    missing.push('or the M3 Market gate passed, with your confirm');
    return { level: 'apply', missing };
  }
  return null;
}

// ---------- readiness ----------

// { ledger, person, state, goal, milestones, rankedRoles?, path?, market? }
// -> { score 0–100, level, components { proof, skills, consistency, market, confidence } (0–20 each),
//      weights, next_gate { name, criteria, missing[] }, explain [rule names], counts, stage_rules }
export function readinessScore(rawInput) {
  const input = asObject(rawInput);
  const ledger = asObject(input.ledger);
  const entries = asArray(ledger.entries).filter((e) => e && typeof e === 'object');
  const count = finite(ledger.count) ?? entries.length;
  const chosenPathId = chosenPathIdOf(input.goal, input.path);
  const gates = gatesOf(input.milestones, input.goal);

  const proof = proofComponent(entries);
  const skills = skillsComponent({ chosenPathId, rankedRoles: input.rankedRoles, path: input.path, person: input.person });
  const consistency = consistencyComponent({ state: input.state, entries });
  const market = marketComponent({ market: input.market, entries });
  const confidence = confidenceComponent(input.state);

  const components = { proof: proof.value, skills: skills.value, consistency: consistency.value, market: market.value, confidence: confidence.value };
  const score = clamp(Object.values(components).reduce((sum, v) => sum + v, 0), 0, 100);
  const stage = stageLevel({ chosenPathId, count, gates, reachOuts: market.reachOuts, applications: market.applications });

  return {
    score,
    level: stage.level,
    components,
    weights: { ...WEIGHTS, note: 'design priors (확인 필요): equal 20-point components, summed to 100' },
    next_gate: nextGate({ gates, count }),
    next_level: nextLevel({ level: stage.level, count, gates, reachOuts: market.reachOuts, applications: market.applications }),
    explain: [proof.rule, skills.rule, consistency.rule, market.rule, confidence.rule, stage.rule],
    counts: {
      entries: count,
      full: proof.full,
      micro: proof.micro,
      reachOuts: market.reachOuts,
      applications: market.applications,
      showedUpDays: consistency.showedUp,
      weeks: consistency.weeks,
      gatesPassed: GATE_TEMPLATES.map((t) => t.id).filter((id) => gatePassed(gates, id)),
    },
    stage_rules: { ...STAGE_RULES },
  };
}
