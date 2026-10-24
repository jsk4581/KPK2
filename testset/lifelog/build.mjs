#!/usr/bin/env node
// build.mjs — turn each static [SIMULATION] lifelog scenario into an analysis file:
// raw lifelog -> L2 filter -> ontology (graph) -> daily state -> guide (dream moment -> gates -> today)
// -> monitoring (daily interventions, weekly reviews, market drift, goal re-check).
// Every judgment comes from the brain's deterministic modules; this script only wires them
// together and adds two proposal rules marked `proposal: true` (market drift, goal re-check).
// No clock, no network, no LLM. Usage: node testset/lifelog/build.mjs [--check]

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { applyCheckin, extractSkills, skillOverlap, WEEK_DAYS } from '../../app/logic.js';
import { estimateState, weekdayOf, daysBetween } from '../../brain/state.js';
import { rootConstraint } from '../../brain/constraint.js';
import { decideIntervention } from '../../brain/policy.js';
import { weeklyReview, compareWeek } from '../../brain/monitor.js';
import { buildPersonModel } from '../../brain/person.js';
import { goalState, milestones, addDays } from '../../brain/goal.js';
import { render } from '../../brain/messages.js';

const HERE = new URL('./', import.meta.url);
const SCENARIO_DIR = new URL('scenarios/', HERE);
const OUT_DIR = new URL('out/', HERE);
const MARKET_DRIFT_PCT = -15; // proposal (architecture v1.1 c): latest vs mean of previous points
const CONDITION_WINDOW_DAYS = 14;

const byDate = (date) => (x) => x.date <= date;
const round3 = (n) => Math.round((n + Number.EPSILON) * 1000) / 1000;

function fail(id, message) {
  throw new Error(`${id}: ${message}`);
}

// ---------- validation ----------

function validate(s) {
  if (s._label !== 'synthetic') fail(s.id, '_label must be synthetic');
  const ids = s.lifelog.map((i) => i.id);
  if (new Set(ids).size !== ids.length) fail(s.id, 'duplicate lifelog id');
  for (const item of s.lifelog) {
    if (item.date < s.arc_start || item.date > s.today) fail(s.id, `${item.id} outside the arc`);
    if (item.condition !== undefined && !(item.condition >= 1 && item.condition <= 5)) fail(s.id, `${item.id} bad condition`);
  }
  for (const c of s.checkins) {
    if (weekdayOf(c.date) !== c.day) fail(s.id, `check-in ${c.date} is not a ${c.day}`);
  }
  for (const g of s.gate_events) for (const e of g.evidence) if (!ids.includes(e)) fail(s.id, `gate ${g.gate} cites missing ${e}`);
}

// ---------- week replay (uses Build's applyCheckin, so moves follow the shipped rule) ----------

function weekIndexOf(s, date) {
  return Math.floor(daysBetween(s.arc_start, date) / 7);
}

function replayWeek(s, weekIdx, uptoDate) {
  const plan = s.weeks[weekIdx];
  if (!plan) return null;
  let week = {
    actions: plan.actions.map((a) => ({ ...a })),
    pathId: s.path.role_id,
    pathTitle: s.path.title,
    pendingComeback: false,
  };
  const end = addDays(plan.start, 6);
  const records = s.checkins.filter((c) => c.date >= plan.start && c.date <= end && c.date <= uptoDate);
  for (const c of records) {
    const result = applyCheckin(week, c.actionId, c.kind, c.day);
    if (!result.ok) fail(s.id, `check-in ${c.date} ${c.actionId} refused: ${result.reason}`);
    week = result.week;
  }
  return { week, records };
}

// ---------- ontology ----------

function buildOntology(s, kept, filtered, todayState, constraint) {
  // Skill vs interest: what the person produced or did (documents, calendar, messages, notes on own
  // work) is skill evidence; saved links and 'pull' notes show interest only. Reading about UX writing
  // is not a UX writing skill. Fields career/now count as skill text, pull as interest text.
  const isInterest = (i) => i.source === 'saved_link' || i.field === 'pull';
  const production = kept.filter((i) => !isInterest(i));
  const skillText = { career: s.fields.career, now: s.fields.now, pull: '' };
  const knowHow = extractSkills(skillText, production, s.skills);
  const knowHowAtStart = extractSkills(skillText, [], s.skills);
  const interests = extractSkills({ career: '', now: '', pull: s.fields.pull }, kept.filter(isInterest), s.skills);
  const itemText = (i) => [i.title, i.summary, ...(i.tags || [])].join(' ').toLowerCase();
  const skillEvidence = Object.fromEntries(
    s.skills.map((sk) => [
      sk.id,
      production.filter((i) => (i.tags || []).includes(sk.id) || sk.keywords.some((k) => itemText(i).includes(k.toLowerCase()))).map((i) => i.id),
    ])
  );
  const dreamTags = new Set(s.dream_moment.tags);
  const roles = s.roles.map((role) => {
    const now = skillOverlap(knowHow, role);
    const start = skillOverlap(knowHowAtStart, role);
    const alignment = round3(role.requires.filter((r) => dreamTags.has(r)).length / dreamTags.size);
    return { id: role.id, title: role.title, overlap_start: start.ratio, overlap_now: now.ratio, transfers: now.transfers, missing: now.missing, dream_alignment: alignment, ai_exposure: role.ai_exposure };
  });

  const nodes = [
    { id: 'person', type: 'Person', label: s.persona.name, archetype: null },
    { id: 'dream', type: 'DreamMoment', label: s.dream_moment.text, horizon: s.dream_moment.horizon },
    ...s.skills.map((sk) => ({ id: `skill:${sk.id}`, type: 'Skill', label: sk.name, evidence: skillEvidence[sk.id], known: knowHow.includes(sk.id) })),
    ...roles.map((r) => ({ id: `role:${r.id}`, type: 'Role', label: r.title, overlap: r.overlap_now, dream_alignment: r.dream_alignment, ai_exposure: r.ai_exposure })),
    ...kept.map((i) => ({ id: `event:${i.id}`, type: 'LifeEvent', date: i.date, source: i.source, signal: i.signal, label: i.title })),
    { id: `constraint:${constraint.constraint}`, type: 'Constraint', label: constraint.constraint, evidence: constraint.evidence },
    { id: 'state:today', type: 'State', date: s.today, energy: todayState.energy, momentum: todayState.momentum, selfEfficacy: todayState.selfEfficacy, risk: todayState.risk.level },
  ];
  const edges = [
    ...interests.map((id) => ({ from: 'person', rel: 'interested_in', to: `skill:${id}`, evidence: kept.filter(isInterest).filter((i) => (i.tags || []).includes(id)).map((i) => i.id) })),
    ...knowHow.map((id) => ({ from: 'person', rel: 'has_skill', to: `skill:${id}`, evidence: skillEvidence[id] })),
    ...s.roles.flatMap((role) => role.requires.map((req) => ({ from: `skill:${req}`, rel: 'required_by', to: `role:${role.id}` }))),
    { from: 'person', rel: 'chose', to: `role:${s.path.role_id}`, date: s.path.chosen_on },
    ...roles.map((r) => ({ from: `role:${r.id}`, rel: 'serves_dream', to: 'dream', weight: r.dream_alignment })),
    ...kept.flatMap((i) => (i.tags || []).filter((t) => skillEvidence[t]).map((t) => ({ from: `event:${i.id}`, rel: isInterest(i) ? 'shows_interest' : 'evidences', to: `skill:${t}` }))),
    ...constraint.signals.map((sig) => ({ from: `constraint:${sig.constraint}`, rel: 'observed_in', to: sig.type === 'lifelog' ? `event:${sig.id}` : `checkin:${sig.id}`, weight: sig.weight })),
    { from: 'state:today', rel: 'derived_from', to: todayState.lastLogId ? `event:${todayState.lastLogId}` : null },
  ];
  return {
    l2_filter: { kept: kept.length, filtered: filtered.map((i) => ({ id: i.id, source: i.source, reason: 'noise' })) },
    know_how_start: knowHowAtStart,
    know_how_now: knowHow,
    interests,
    roles,
    nodes,
    edges,
  };
}

// ---------- monitoring helpers ----------

function knownConditions(features, uptoDate) {
  return features
    .filter((f) => f.date <= uptoDate && daysBetween(f.date, uptoDate) < CONDITION_WINDOW_DAYS && f.condition !== null)
    .map((f) => f.condition);
}

function marketDrift(role) {
  const idx = role.postings_index || [];
  if (idx.length < 2) return null;
  const latest = idx[idx.length - 1];
  const prev = idx.slice(0, -1);
  const base = prev.reduce((a, b) => a + b, 0) / prev.length;
  const pct = round3(((latest - base) / base) * 100);
  return { role_id: role.id, latest, baseline: round3(base), pct, flag: pct <= MARKET_DRIFT_PCT, rule: `latest vs mean of previous ${prev.length} weekly points <= ${MARKET_DRIFT_PCT}%`, proposal: true };
}

function goalRecheck(s, ontology, drift) {
  const chosen = ontology.roles.find((r) => r.id === s.path.role_id);
  const better = ontology.roles.filter((r) => r.id !== chosen.id && r.dream_alignment > chosen.dream_alignment).sort((a, b) => b.dream_alignment - a.dream_alignment)[0];
  if (!drift || !drift.flag || !better) return { ask: false, proposal: true };
  return {
    ask: true,
    proposal: true,
    question: `Postings for ${chosen.title} fell ${Math.abs(drift.pct)}% while your dream moment points to ${better.title}. Is this still the right path, or a stepping stone?`,
    from: chosen.id,
    candidate: better.id,
    candidate_overlap: better.overlap_now,
    candidate_missing: better.missing,
    auto_change: false,
  };
}

// ---------- one scenario ----------

function analyze(s) {
  validate(s);
  const kept = s.lifelog.filter((i) => i.signal !== 'noise');
  const filtered = s.lifelog.filter((i) => i.signal === 'noise');
  const person = buildPersonModel({ fields: s.fields, lifelog: kept, skills: s.skills, chosenPathId: s.path.role_id, checkins: s.checkins });
  const gates = milestones({ role_id: s.path.role_id, title: s.path.title }, s.arc_start);

  const timeline = [];
  const reviews = [];
  const riskHistory = [];
  for (let d = 0; d <= daysBetween(s.arc_start, s.today); d += 1) {
    const date = addDays(s.arc_start, d);
    const lifelog = kept.filter(byDate(date));
    const checkins = s.checkins.filter(byDate(date));
    const state = estimateState({ lifelog, checkins, today: date, arcStart: s.arc_start });
    const constraint = rootConstraint({ lifelog, checkins, today: date });
    const wIdx = weekIndexOf(s, date);
    const replay = replayWeek(s, wIdx, date);
    const gateEvent = s.gate_events.find((g) => g.date === date && g.confirmed);
    const doneSoFar = checkins.filter((c) => c.kind === 'done').length;
    let gate = null;
    if (gateEvent) {
      const g = gates.find((x) => x.id === gateEvent.gate);
      const next = gates[gates.indexOf(g) + 1];
      if (doneSoFar >= g.minDone) {
        g.passed = true;
        g.passedOn = date;
        g.evidenceIds = gateEvent.evidence;
        gate = { passed: true, name: g.name, evidence: gateEvent.evidence.join(', '), next: next ? next.name : 'apply', weeks: next ? next.week - g.week : 0 };
      }
    }
    // Morning guide: what the brain says when the day opens — data up to yesterday plus today's
    // self-reported condition (the first one logged that day), before today's check-ins.
    const prevDate = addDays(date, -1);
    const morningCond = (kept.find((i) => i.date === date && i.condition !== undefined) || {}).condition;
    const mLifelog = kept.filter(byDate(prevDate));
    const mCheckins = s.checkins.filter(byDate(prevDate));
    const mState = estimateState({ lifelog: mLifelog, checkins: mCheckins, today: date, arcStart: s.arc_start, condition: morningCond });
    const mConstraint = rootConstraint({ lifelog: mLifelog, checkins: mCheckins, today: date });
    const mWeek = replayWeek(s, wIdx, prevDate).week;
    const decision = decideIntervention({ state: mState, constraint: mConstraint, week: mWeek, today: date, checkins: mCheckins, gate });
    const message = render(decision.messageKey, decision.slots);
    timeline.push({
      date,
      day: weekdayOf(date),
      week: wIdx + 1,
      energy: state.energy,
      momentum: state.momentum,
      selfEfficacy: state.selfEfficacy,
      capacityMin: state.capacityMin,
      gapDays: state.gapDays,
      dataGapDays: state.dataGapDays,
      risk: { points: state.risk.points, level: state.risk.level, reasons: state.risk.reasons },
      constraint: constraint.constraint,
      morning: { energy: mState.energy, risk: mState.risk.level, riskReasons: mState.risk.reasons, dataGapDays: mState.dataGapDays },
      intervention: { kind: decision.kind, messageKey: decision.messageKey, actionId: decision.actionId, minutes: decision.minutes, choices: decision.choices, reasons: decision.reasons },
      message: message.text,
      message_lint: message.lint.hits,
    });

    if (WEEK_DAYS.indexOf(weekdayOf(date)) === 6) {
      riskHistory.push(state.risk.level);
      const review = weeklyReview({
        week: replay.week,
        checkins: replay.records,
        state: { ...state, conditions: knownConditions(state.features, date), riskHistory: [...riskHistory] },
        person,
        today: date,
        lifelog,
      });
      reviews.push({ week: wIdx + 1, date, compare: review.compare, resize: review.resize, replanQuestion: review.replanQuestion, replanActionId: review.replanActionId, escalate: review.escalate, nextWeekSeed: review.nextWeekSeed });
    }
  }

  const today = timeline[timeline.length - 1];
  const finalLifelog = kept;
  const finalState = estimateState({ lifelog: finalLifelog, checkins: s.checkins, today: s.today, arcStart: s.arc_start });
  const finalConstraint = rootConstraint({ lifelog: finalLifelog, checkins: s.checkins, today: s.today });
  const ontology = buildOntology(s, kept, filtered, finalState, finalConstraint);
  ontology.nodes[0].archetype = person.traits.archetype;
  const chosenRole = s.roles.find((r) => r.id === s.path.role_id);
  const drift = marketDrift(chosenRole);
  const recheck = goalRecheck(s, ontology, drift);
  const lastReview = reviews[reviews.length - 1];
  const nextGate = gates.find((g) => !g.passed);

  const guide = {
    dream_moment: s.dream_moment.text,
    goal_state: goalState({ chosenPathId: s.path.role_id, gates }),
    path: { id: s.path.role_id, title: s.path.title, transfers: ontology.roles.find((r) => r.id === s.path.role_id).transfers, missing: ontology.roles.find((r) => r.id === s.path.role_id).missing },
    gates: gates.map((g) => ({ id: g.id, name: g.name, date: g.date, evidence: g.evidence, dream_signal: (s.dream_moment.signals.find((x) => x.gate === g.id) || {}).text || null, passed: g.passed, passedOn: g.passedOn || null })),
    next_gate: nextGate ? { id: nextGate.id, name: nextGate.name, date: nextGate.date, problem: nextGate.problemGate } : null,
    today: { date: s.today, intervention: today.intervention, message: today.message },
    next_week: lastReview ? { resize: lastReview.resize, seed: lastReview.nextWeekSeed.actions, replanQuestion: lastReview.replanQuestion, escalate: lastReview.escalate } : null,
    goal_recheck: recheck,
  };

  return {
    _label: 'synthetic',
    _note: '[SIMULATION] Generated by testset/lifelog/build.mjs from the brain modules. Not real data.',
    id: s.id,
    story: s.story,
    person: { archetype: person.traits.archetype, archetypeMatches: person.traits.archetypeMatches, stageOfChange: person.traits.stageOfChange, careerCapital: person.traits.careerCapital },
    ontology,
    state_today: { energy: finalState.energy, momentum: finalState.momentum, selfEfficacy: finalState.selfEfficacy, capacityMin: finalState.capacityMin, risk: finalState.risk.level, riskReasons: finalState.risk.reasons, constraint: finalConstraint.constraint, constraintEvidence: finalConstraint.evidence },
    guide,
    monitoring: { timeline, weekly_reviews: reviews, market_drift: drift },
  };
}

// ---------- main ----------

mkdirSync(OUT_DIR, { recursive: true });
const files = readdirSync(SCENARIO_DIR).filter((f) => f.endsWith('.json')).sort();
const summary = [];
for (const file of files) {
  const scenario = JSON.parse(readFileSync(new URL(file, SCENARIO_DIR), 'utf8'));
  const result = analyze(scenario);
  writeFileSync(new URL(`${scenario.id}.analysis.json`, OUT_DIR), JSON.stringify(result, null, 2) + '\n');
  const risks = result.monitoring.timeline.map((t) => t.risk.level[0]).join('');
  summary.push({
    id: scenario.id,
    archetype: result.person.archetype,
    risk_by_day: risks,
    kinds: [...new Set(result.monitoring.timeline.map((t) => t.intervention.kind))].join(','),
    reviews: result.monitoring.weekly_reviews.map((r) => `${r.resize.direction}${r.resize.count}${r.replanQuestion ? '+replan' : ''}${r.escalate ? '+' + r.escalate.reason : ''}`).join(' | '),
    goal: result.guide.goal_state,
    constraint: result.state_today.constraint,
    drift: result.monitoring.market_drift.pct,
    recheck: result.guide.goal_recheck.ask,
    lint: result.monitoring.timeline.flatMap((t) => t.message_lint).length,
  });
}
console.table(summary);
writeFileSync(new URL('summary.json', OUT_DIR), JSON.stringify(summary, null, 2) + '\n');
