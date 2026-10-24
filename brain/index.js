// index.js — the Decision Brain in one call.
//
// think(input) composes Build's judgment functions (app/logic.js, read-only) with the brain
// modules in this folder, in the order of context/BRAIN_ARCH_v2.md §2:
//   logic.summarizeLifelog / extractSkills / rankRoles  →  person.buildPersonModel
//   →  state.estimateState  →  goal.goalState / milestones / nextQuestion
//   →  constraint.rootConstraint  →  monitor.compareWeek (+ weeklyReview)
//   →  policy.decideIntervention  →  messages.render  →  explain.explain
//
// Everything here is pure and deterministic: no DOM, no network, no clock. `today` and
// `condition` are inputs. Unknowns stay 'unknown' / null; nothing is guessed. The only file
// access is loadScenario() (the synthetic demo scenario and its skill/role catalog), which is
// allowed in this entry file and in mcp/bin.js only. The one clock read is process.hrtime for
// the `ms` of trace_layers steps that ran (same as mcp/compat.js); no judgment depends on it.
//
// think() output carries two views of the same pass for the web's [Why?] panel:
//   trace        fn-level steps { fn, input, output, via } (logic.withTrace shape)
//   trace_layers the 4-layer story { layer L1..L4, stage, label, status 'ran'|'designed',
//                input_summary, output_summary, ms } (mcp/compat.js shape; 'designed' = ms null)
//   labels       internal field / enum names -> short user-facing labels (labels.js)
//
// Exports (the BRAIN CONTRACT in mcp/server.js: one input object in, JSON out):
//   think, rankRoles, planWeek, checkIn, analyzeState, explain, jobReadiness, loadScenario,
//   DEFAULT_SOURCES, SCENARIO_IDS

import { readFileSync } from 'node:fs';
import * as logic from '../app/logic.js';
import { buildPersonModel } from './person.js';
import { estimateState, isIsoDate, validCondition, weekdayOf } from './state.js';
import { goalState, goalHistory, milestones, nextQuestion, evaluateGate } from './goal.js';
import { rootConstraint } from './constraint.js';
import { compareWeek, weeklyReview } from './monitor.js';
import { decideIntervention, resolveWeekday, CRISIS_MESSAGE_KEY } from './policy.js';
import { render, lint } from './messages.js';
import { explain as explainDecision } from './explain.js';
import { buildLedger } from './evidence.js';
import { readinessScore } from './jobs.js';
import { withIfThen } from './plan.js';
import { LABELS } from './labels.js';

export const DEFAULT_SOURCES = ['note', 'saved_link', 'calendar'];
export const CONDITION_HISTORY_DAYS = 14;

// Synthetic demo scenarios shipped with the brain (data/README.md). 'dana' is the default.
export const SCENARIO_IDS = ['dana', 'maya'];
const SCENARIO_FILES = {
  dana: new URL('./data/dana-14d.json', import.meta.url),
  maya: new URL('./data/maya-21d.json', import.meta.url),
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

// ---------- scenario (synthetic; the only file read in the brain core) ----------

// Parsed brain/data/<id>.json ('dana' by default, or 'maya'). Throws on an unknown id and when
// the file is missing or not JSON.
export function loadScenario(id = 'dana') {
  const key = asText(id).trim() || 'dana';
  const url = SCENARIO_FILES[key];
  if (!url) throw new Error(`unknown scenario: ${key} (expected ${SCENARIO_IDS.join(' | ')})`);
  return JSON.parse(readFileSync(url, 'utf8'));
}

// Skill/role catalog used when a caller passes none. Falls back to empty catalogs so think()
// still answers (with no skills and no roles) when the scenario file is absent.
const CATALOG = (() => {
  try {
    const scenario = loadScenario();
    return { skills: asArray(scenario.skills), roles: asArray(scenario.roles), fallbackPaths: asArray(scenario.fallback && scenario.fallback.paths) };
  } catch {
    return { skills: [], roles: [], fallbackPaths: [] };
  }
})();

// ---------- input helpers ----------

function sourcesOf(input) {
  const list = asArray(input.enabledSources).map(asText).filter(Boolean);
  return list.length > 0 ? list : [...DEFAULT_SOURCES];
}

// Only items from enabled sources reach any brain module (the source toggles are a privacy rule).
function enabledItems(lifelog, sources) {
  const enabled = new Set(sources);
  return asArray(lifelog).filter((item) => item && typeof item === 'object' && enabled.has(item.source));
}

function checkinRecords(checkins) {
  return asArray(checkins).filter((c) => c && typeof c === 'object' && (c.kind === 'done' || c.kind === 'not_today'));
}

function catalogOf(input) {
  return {
    skills: asArray(input.skills).length > 0 ? input.skills : CATALOG.skills,
    roles: asArray(input.roles).length > 0 ? input.roles : CATALOG.roles,
  };
}

// Fields the user typed keep their text; empty fields take the lifelog summary (Build's mergePrefill).
function mergeFields(current, summary) {
  const base = asObject(current);
  const edited = logic.FIELD_KEYS.filter((key) => asText(base[key]).trim() !== '');
  return logic.mergePrefill(base, summary, edited);
}

function pathOf(input, week) {
  const path = asObject(input.path);
  if (Object.keys(path).length > 0) return path;
  const w = asObject(week);
  return asText(w.pathId) ? { role_id: w.pathId, title: w.pathTitle } : null;
}

function chosenPathIdOf(path, week) {
  return asText(path && (path.role_id || path.id)) || asText(asObject(week).pathId) || null;
}

// A path draft with no actions of its own borrows the scenario's fallback draft for the same role.
function pathWithActions(path) {
  const draft = asObject(path);
  const own = asArray(draft.week && draft.week.actions).length > 0 ? draft.week.actions : asArray(draft.actions);
  if (own.length > 0) return draft;
  const roleId = asText(draft.role_id || draft.id);
  const fallback = CATALOG.fallbackPaths.find((p) => p && asText(p.role_id) === roleId);
  return fallback ? { ...fallback, ...draft, week: fallback.week } : draft;
}

function arcStartOf(input) {
  const raw = input.arcStart ?? input.arc_start;
  return isIsoDate(raw) ? raw : null;
}

// Wall-clock timing of the steps that ran, for trace_layers[].ms only. Results never depend on it.
function stopwatch() {
  const spent = new Map();
  const round = (ms) => Math.round(ms * 100) / 100;
  return {
    time(name, fn) {
      const started = process.hrtime.bigint();
      const result = fn();
      spent.set(name, (spent.get(name) || 0) + Number(process.hrtime.bigint() - started) / 1e6);
      return result;
    },
    ms(...names) {
      return round(names.reduce((sum, name) => sum + (spent.get(name) || 0), 0));
    },
  };
}

// Trace helper: same { fn, input, output, via } shape as logic.withTrace. With a stopwatch the
// call is timed under its fn name (the fn-level entry itself stays clock-free).
function traced(trace, name, fn, via, clock = null) {
  return (...args) => {
    const run = () => logic.withTrace(name, fn, { via })(...args);
    const { result, trace: entry } = clock ? clock.time(name, run) : run();
    trace.push(entry);
    return result;
  };
}

// ---------- gates ----------

// Four milestones evaluated against the check-ins. A gate passes only when evaluateGate says so
// (evidence AND the user's confirm flag); `confirmedGates` lists the gate ids the user confirmed.
function evaluateGates(path, arcStart, input, week, checkins) {
  if (Array.isArray(input.gates)) return input.gates.filter((g) => g && typeof g === 'object');
  const confirmed = new Set(asArray(input.confirmedGates).map(asText));
  const confirmAll = input.confirmed === true;
  return milestones(path || {}, arcStart).map((gate) => {
    const verdict = evaluateGate(gate, { checkins, week, confirmed: confirmAll || confirmed.has(gate.id) });
    return { ...gate, passed: verdict.passed, evaluation: verdict };
  });
}

// The passed gate (if any) in the shape policy.decideIntervention expects, else null.
function gateForPolicy(gates) {
  const index = gates.findIndex((g) => g.passed === true);
  if (index < 0) return null;
  const gate = gates[index];
  const next = gates[index + 1] || null;
  return {
    passed: true,
    id: gate.id,
    name: [gate.id, gate.name].filter(Boolean).join(' '),
    evidence: gate.evidence,
    next: next ? [next.id, next.name].filter(Boolean).join(' ') : 'the next review',
    weeks: next && Number.isFinite(Number(next.week)) && Number.isFinite(Number(gate.week)) ? Number(next.week) - Number(gate.week) : null,
  };
}

// ---------- goal history ----------

// Why the goal state is what it is, in rule words (recorded in the goal history, never a judgement).
function goalReason(status, gates) {
  if (status === 'ambiguous') return 'no path chosen';
  const passed = gates.filter((g) => g.passed === true);
  if (status === 'validated') return `gate ${passed.map((g) => g.id).join(', ')} passed with confirm`;
  return passed.length > 0 ? 'latest due gate not passed; re-check' : 'path chosen, no gate passed yet';
}

// Goal version history (§2.1 goal_version): the caller's previous history plus one entry when the
// state changed since the last entry. `at` is the demo today (an input), never the clock.
// input.notNow (string[]) is merged into not_now (deduplicated) without creating an entry.
function goalVersion(input, status, gates, todayIso) {
  const prev = Array.isArray(input.goalHistory) ? { history: input.goalHistory } : asObject(input.goalHistory);
  const base = { ...prev, not_now: [...asArray(prev.not_now ?? prev.notNow), ...asArray(input.notNow)] };
  const entries = asArray(base.history).filter((e) => e && typeof e === 'object');
  const last = entries.length > 0 ? entries[entries.length - 1] : null;
  const lastTo = last ? asText(last.to) || null : null;
  // No entry while nothing changed, and none before a goal exists (ambiguous with no history).
  if (lastTo === status || (lastTo === null && status === 'ambiguous')) return goalHistory(base, {});
  const passed = gates.find((g) => g.passed === true);
  const event = { at: todayIso, from: lastTo, to: status, reason: goalReason(status, gates) };
  if (status === 'validated' && passed) event.gateId = passed.id;
  return goalHistory(base, event);
}

// ---------- messages ----------

// §6.5 crisis pause: the fixed support text from policy (decision.text) is the whole message.
// Same shape as messages.render so consumers read ack / reframe / next / text / lint as usual.
function crisisMessage(decision) {
  const text = asText(decision.text);
  const lines = text.split('\n');
  return {
    key: CRISIS_MESSAGE_KEY,
    requestedKey: asText(decision.messageKey) || CRISIS_MESSAGE_KEY,
    ack: lines[0] || text,
    reframe: lines.slice(1, -1).join('\n'),
    next: lines.length > 1 ? lines[lines.length - 1] : '',
    text,
    lint: { ...lint(text), scrubbed: [] },
  };
}

// §6.5 non-crisis escalations (economic pressure, low condition, red risk): the resource sentence
// from monitor is appended after the next-step line. The sentence is only added when it passes lint.
function withEscalation(message, escalate) {
  const sentence = asText(escalate && escalate.message).trim();
  if (sentence === '' || !lint(sentence).ok) return message;
  const text = [message.text, sentence].filter(Boolean).join('\n');
  return { ...message, escalation: { reason: asText(escalate.reason), message: sentence }, text, lint: { ...lint(text), scrubbed: message.lint.scrubbed } };
}

// ---------- trace_layers (the 4-layer story the web's [Why?] panel shows) ----------

const clip = (text) => (asText(text).length > 240 ? `${asText(text).slice(0, 237)}...` : asText(text));
const ids = (list) => asArray(list).map((item) => asText(item && typeof item === 'object' ? item.id : item)).filter(Boolean);

function ranStep(layer, stage, label, inputSummary, outputSummary, ms) {
  return { layer, stage, label, status: 'ran', input_summary: clip(inputSummary), output_summary: clip(outputSummary), ms };
}

function designedStep(layer, stage, label, inputSummary, outputSummary) {
  return { layer, stage, label, status: 'designed', input_summary: clip(inputSummary), output_summary: clip(outputSummary), ms: null };
}

// Same step shape and labels as mcp/compat.js. 'ran' only for what executed in this pass (ms from
// the stopwatch); the live scrub and the ontology graph are design-only and stay 'designed'.
function traceLayers(clock, report, extra) {
  const { person, state, goal, constraint, monitor, ledger, readiness, intervention, explain: why, context } = report;
  const { rawLifelogCount, rawCheckinCount, roleCount, rankedFromInput, condition, gate } = extra;
  const message = asObject(intervention.message);
  const review = asObject(monitor.review);
  const passed = ids(asArray(goal.milestones).filter((g) => g.passed === true));
  const sourcesSeen = [...new Set(asArray(extra.lifelog).map((item) => asText(item.source)).filter(Boolean))];
  const filledFields = Object.keys(asObject(context.fields)).filter((key) => asText(context.fields[key]).trim() !== '');
  const lineCount = asText(message.text) === '' ? 0 : asText(message.text).split('\n').length;
  const lintNote = asObject(message.lint).ok === false ? `hits: ${asArray(message.lint.hits).join(', ')}` : 'ok';
  const val = (v) => (v === null || v === undefined ? 'unknown' : asText(v));

  return [
    ranStep('L1', 'ingest', 'Parse lifelog items',
      `${rawLifelogCount} lifelog items and ${rawCheckinCount} check-ins received; enabled sources: ${context.enabledSources.join(', ')}`,
      `${context.lifelogCount} items from enabled sources (${sourcesSeen.join(', ') || 'none'}) and ${context.checkinCount} check-ins reach the brain`,
      clock.ms('ingest')),
    designedStep('L2', 'scrub', 'Scrub live ingest (PII filter)', 'live lifelog stream', 'Design, not running today: the demo lifelog is synthetic and arrives pre-scrubbed.'),
    designedStep('L2', 'graph', 'Ontology graph (skills ↔ roles ↔ evidence)', 'lifelog + skill catalog', 'Design, not running today: overlap is computed on the flat skill catalog instead.'),
    ranStep('L3', 'paths', 'Rank roles by skill overlap (brain rankRoles)',
      `fields ${filledFields.join(', ') || 'empty'} + ${context.lifelogCount} lifelog items; ${roleCount} catalog roles`,
      rankedFromInput
        ? `skills [${context.skillIds.join(', ')}]; ranked roles taken from the caller (${asArray(context.rankedRoles).length}), not recomputed`
        : `skills [${context.skillIds.join(', ')}] → ${asArray(context.rankedRoles).map((r) => `${asText(r.id)} ${asText(r.ratio)}`).join(' · ') || 'no roles'}`,
      clock.ms('summarizeLifelog', 'extractSkills', 'rankRoles')),
    ranStep('L3', 'person', 'Person model (brain buildPersonModel)',
      `fields + ${context.lifelogCount} lifelog items + ${context.checkinCount} check-ins; self-declared constraints and 4C as given`,
      `archetype ${asText(asObject(person.traits).archetype)} · stage ${asText(asObject(person.traits).stageOfChange)} · ${asArray(person.evidence).length} evidence ids`,
      clock.ms('buildPersonModel')),
    ranStep('L3', 'goal', 'Goal state and gates (brain goalState + evaluateGate)',
      `path ${goal.chosenPathId || 'none'} · ${asArray(goal.milestones).length} gates · today ${val(context.today)}`,
      `${goal.state} · gates passed: ${passed.join(', ') || 'none'} · version ${asText(goal.version)}`,
      clock.ms('goalState', 'evaluateGates')),
    ranStep('L4', 'state', 'Estimate state (brain estimateState)',
      `${context.lifelogCount} lifelog items + ${context.checkinCount} check-ins · today ${val(context.today)} · condition ${val(condition)}`,
      `energy ${val(state.energy)} · momentum ${val(state.momentum)} · confidence ${val(state.selfEfficacy)} · capacity ${val(state.capacityMin)} min · risk ${asText(asObject(state.risk).level)} (${asArray(asObject(state.risk).reasons).join(', ') || 'no reasons'})`,
      clock.ms('estimateState')),
    ranStep('L4', 'constraint', 'Root constraint (brain rootConstraint, COM-B)',
      `blocker reasons tapped in ${context.checkinCount} check-ins · today ${val(context.today)}`,
      `${asText(constraint.constraint)} · ${asArray(constraint.evidence).length} evidence ids · rule ${asText(constraint.reason) || 'none'}`,
      clock.ms('rootConstraint')),
    ranStep('L4', 'monitor', 'Plan versus reality (brain compareWeek + weeklyReview)',
      `${asArray(asObject(context.week).actions).length} planned actions · ${context.checkinCount} check-ins`,
      `drift: ${asArray(monitor.drift).map((d) => asText(d.type)).join(', ') || 'none'} · plateau ${monitor.plateau === true} · replan question ${review.replanQuestion ? 'yes' : 'no'} · escalation ${review.escalate ? asText(review.escalate.reason) : 'none'}`,
      clock.ms('compareWeek', 'weeklyReview')),
    ranStep('L4', 'readiness', 'Evidence ledger and job readiness (brain buildLedger + readinessScore)',
      `done check-ins + ${context.lifelogCount} lifelog items · ${asArray(goal.milestones).length} gates · market ${extra.marketGiven ? 'given' : 'none'}`,
      `${asArray(ledger.entries).length} ledger entries → ${val(readiness.score)}/100 · stage ${asText(readiness.level)} · next gate ${asText(asObject(readiness.next_gate).id) || 'none'}`,
      clock.ms('buildLedger', 'readinessScore')),
    ranStep('L4', 'policy', "Decide today's step (brain decideIntervention)",
      `risk ${asText(asObject(state.risk).level)} · constraint ${asText(constraint.constraint)} · gate ${gate ? asText(gate.id) : 'none'} · escalation ${review.escalate ? asText(review.escalate.reason) : 'none'}`,
      `${asText(intervention.kind)}${intervention.actionId ? ` ${asText(intervention.actionId)}` : ''} (${val(intervention.minutes)} min) → ${asText(intervention.messageKey)} · ${asArray(intervention.choices).length} choices · ${asArray(intervention.reasons).join(', ') || 'no reasons'}`,
      clock.ms('decideIntervention')),
    ranStep('L4', 'messages', 'Write the message (messages.render + lint)',
      `${asText(message.key)} · slots ${Object.keys(asObject(intervention.slots)).length}`,
      `${lineCount} lines · lint ${lintNote} · scrubbed slots ${asArray(asObject(message.lint).scrubbed).join(', ') || 'none'}${message.escalation ? ' · resource line added' : ''}`,
      clock.ms('render')),
    ranStep('L4', 'explain', 'Explain (rule names + evidence ids)',
      `decision ${asText(intervention.kind)} · ${context.lifelogCount} lifelog items · ${context.checkinCount} check-ins`,
      `${asArray(why.rules).length} rules · ${asArray(why.evidence).length} evidence ids`,
      clock.ms('explain')),
  ];
}

// ---------- think ----------

// One brain pass. Input (all optional; the screen state as is):
//   { fields, lifelog, enabledSources, rankedRoles, path, week, checkins, condition, today,
//     skills?, roles?, arcStart?, gates? | confirmedGates? | confirmed?, freeText?,
//     goalHistory?, notNow?, constraints?, adaptability4c?, market? }
// Output: { person, state, goal, constraint, monitor, ledger, readiness,
//           intervention: { ...decision, message }, explain, trace, trace_layers, labels, context }
export function think(rawInput) {
  const input = asObject(rawInput);
  const trace = [];
  const clock = stopwatch();
  const run = (name, fn, via) => traced(trace, name, fn, via, clock);
  const sources = sourcesOf(input);
  const { lifelog, checkins } = clock.time('ingest', () => ({ lifelog: enabledItems(input.lifelog, sources), checkins: checkinRecords(input.checkins) }));
  const catalog = catalogOf(input);
  const condition = validCondition(input.condition);

  // 1. Build's judgment: summary -> fields -> skills -> ranked roles.
  const summary = run('summarizeLifelog', logic.summarizeLifelog, 'logic')(lifelog, sources);
  const fields = mergeFields(input.fields, summary);
  const skillIds = run('extractSkills', logic.extractSkills, 'logic')(fields, lifelog, catalog.skills);
  const rankedFromInput = asArray(input.rankedRoles).length > 0;
  const rankedRoles = rankedFromInput
    ? input.rankedRoles
    : run('rankRoles', logic.rankRoles, 'logic')(skillIds, catalog.roles);

  // Week: the screen's week as is; otherwise built from the chosen path (Build's buildWeek).
  const todayWeekday = resolveWeekday(input.today, input.week);
  let week = asObject(input.week);
  const path = pathOf(input, week);
  if (asArray(week.actions).length === 0 && path) {
    week = run('buildWeek', logic.buildWeek, 'logic')(pathWithActions(path), todayWeekday);
  }
  const chosenPathId = chosenPathIdOf(path, week);

  // 2. Who is this person (constraints / adaptability are self-declared inputs, never inferred).
  const person = run('buildPersonModel', buildPersonModel, 'brain')({
    fields, lifelog, skills: catalog.skills, rankedRoles, chosenPathId, checkins,
    constraints: input.constraints, adaptability4c: input.adaptability4c,
  });

  // 3. What state are they in (today / condition are inputs; arcStart fills in from the log).
  const state = run('estimateState', estimateState, 'brain')({
    lifelog, checkins, today: input.today, condition, arcStart: arcStartOf(input),
  });
  const todayIso = isIsoDate(input.today) ? input.today : state.today;

  // 4. What is blocking them (only from reasons they tapped).
  const constraint = run('rootConstraint', rootConstraint, 'brain')({ checkins, lifelog, today: todayIso });

  // 5. What do they want and how far along are they. `today` lets goalState re-check a validated
  //    goal at every due gate (a due gate not passed -> back to provisional).
  const gates = clock.time('evaluateGates', () => evaluateGates(path, state.arcStart, input, week, checkins));
  const goalStatus = run('goalState', goalState, 'brain')({ chosenPathId, gates, today: todayIso });
  const history = goalVersion(input, goalStatus, gates, todayIso);
  const goal = {
    state: goalStatus,
    chosenPathId,
    pathTitle: asText(path && (path.title || path.role_title)) || asText(week.pathTitle) || null,
    arcStart: state.arcStart,
    milestones: gates,
    nextQuestion: nextQuestion({ person, goalState: goalStatus, constraint: constraint.constraint }),
    version: history.version,
    history: history.history,
    notNow: history.not_now,
  };

  // 6. Plan versus reality (+ the weekly review on the same inputs).
  const compare = run('compareWeek', compareWeek, 'brain')({ week, checkins, lifelog, today: todayIso ?? input.today });
  const conditions = asArray(state.features).slice(-CONDITION_HISTORY_DAYS).map((f) => f.condition);
  const review = clock.time('weeklyReview', () => weeklyReview({ week, checkins, state: { ...state, conditions }, person, today: todayIso ?? input.today, lifelog, freeText: input.freeText }));
  const monitor = { ...compare, review };

  // 7. Success -> work: the evidence shelf (done check-ins only) and the job-readiness score.
  const ledger = run('buildLedger', buildLedger, 'brain')({
    week, checkins, lifelog, path, today: todayIso, arcStart: state.arcStart, skills: catalog.skills,
  });
  const readiness = run('readinessScore', readinessScore, 'brain')({
    ledger, person, state, goal, milestones: gates, rankedRoles, path, market: input.market,
  });

  // 8. Today: which one action, how big, framed how. The weekly review's escalation goes in:
  //    crisis language pauses coaching (§6.5), the other escalations add their resource sentence.
  const gate = gateForPolicy(gates);
  const decision = run('decideIntervention', decideIntervention, 'brain')({
    state, constraint, week, today: input.today ?? todayWeekday, checkins, gate, escalate: review.escalate,
  });
  let message;
  if (decision.kind === 'pause') {
    message = clock.time('render', () => crisisMessage(decision));
  } else {
    message = run('render', render, 'brain')(decision.messageKey, decision.slots);
    if (review.escalate) message = withEscalation(message, review.escalate);
  }

  // 9. Why.
  const why = clock.time('explain', () => explainDecision(decision, { state, constraint, lifelog, checkins, week, today: todayIso }));

  const report = {
    person,
    state,
    goal,
    constraint,
    monitor,
    ledger,
    readiness,
    intervention: { ...decision, message },
    explain: why,
    trace,
    context: {
      today: todayIso,
      todayWeekday,
      enabledSources: sources,
      lifelogCount: lifelog.length,
      checkinCount: checkins.length,
      fields,
      skillIds,
      rankedRoles,
      week,
    },
  };

  // 10. The same pass as the web's [Why?] panel reads it: the 4-layer story and the plain names.
  return {
    ...report,
    trace_layers: traceLayers(clock, report, {
      rawLifelogCount: asArray(input.lifelog).length,
      rawCheckinCount: asArray(input.checkins).length,
      roleCount: asArray(catalog.roles).length,
      rankedFromInput,
      condition,
      gate,
      lifelog,
      marketGiven: Object.keys(asObject(input.market)).length > 0,
    }),
    labels: LABELS,
  };
}

// ---------- the smaller tools ----------

// { fields, lifelog, enabledSources, userSkillIds?, skills?, roles? }
// -> { fields, skillIds, roles (top 3), enabledSources, trace }
export function rankRoles(rawInput) {
  const input = asObject(rawInput);
  const trace = [];
  const sources = sourcesOf(input);
  const lifelog = enabledItems(input.lifelog, sources);
  const catalog = catalogOf(input);
  const summary = traced(trace, 'summarizeLifelog', logic.summarizeLifelog, 'logic')(lifelog, sources);
  const fields = mergeFields(input.fields, summary);
  const given = asArray(input.userSkillIds).map(asText).filter(Boolean);
  const skillIds = given.length > 0
    ? [...new Set(given)].sort()
    : traced(trace, 'extractSkills', logic.extractSkills, 'logic')(fields, lifelog, catalog.skills);
  const roles = traced(trace, 'rankRoles', logic.rankRoles, 'logic')(skillIds, catalog.roles);
  return { fields, skillIds, roles, enabledSources: sources, trace };
}

// { path, today, condition?, anchor? } -> { week, view, today, condition }
// `view` is the week sized for the condition (Build's sizeForCondition); `week` is what check_in takes.
// Every action carries its if-then line (plan.withIfThen): the day only, unless the caller names
// an anchor (never guessed), and milestone M1 unless the action says otherwise.
export function planWeek(rawInput) {
  const input = asObject(rawInput);
  const todayWeekday = resolveWeekday(input.today, null);
  const built = logic.buildWeek(pathWithActions(input.path), todayWeekday);
  const week = withIfThen(built, { anchor: asText(input.anchor) || null, milestone: 'M1' });
  const condition = validCondition(input.condition);
  return { week, view: logic.sizeForCondition(week, condition), today: todayWeekday, condition };
}

// { week, actionId, kind, today, checkins, lifelog, condition?, reason?, ...think inputs }
// -> { ...applyCheckin result, checkins (with the new record), brain (think on the new week) }
// Refusals come back as Build returns them (ok: false, week unchanged) with brain: null.
// `today` is only translated (ISO date -> weekday), never filled in from the week: an unknown
// `today` reaches applyCheckin as is so Build refuses it with `invalid-today`, same as the screen.
export function checkIn(rawInput) {
  const input = asObject(rawInput);
  const week = asObject(input.week);
  const todayWeekday = isIsoDate(input.today) ? weekdayOf(input.today) : input.today;
  const result = logic.applyCheckin(week, asText(input.actionId), input.kind, todayWeekday);
  if (!result.ok) return { ...result, checkins: asArray(input.checkins), brain: null };

  const record = { actionId: asText(input.actionId), kind: input.kind, day: todayWeekday };
  if (isIsoDate(input.today)) record.date = input.today;
  const condition = validCondition(input.condition);
  if (condition !== null) record.condition = condition;
  if (input.kind === 'not_today' && asText(input.reason)) record.blocker_reason = asText(input.reason);
  const checkins = [...asArray(input.checkins), record];

  const brain = think({ ...input, week: result.week, checkins });
  return { ...result, checkins, brain };
}

// { lifelog, checkins, today?, condition?, enabledSources?, arcStart? } -> estimateState output
export function analyzeState(rawInput) {
  const input = asObject(rawInput);
  const lifelog = enabledItems(input.lifelog, sourcesOf(input));
  return estimateState({ lifelog, checkins: checkinRecords(input.checkins), today: input.today, condition: validCondition(input.condition), arcStart: arcStartOf(input) });
}

// { decision?, ...think input } -> { rules, evidence, trace, text }
// With `decision` (a think report or a bare decision) the explanation is for that decision against
// the state recomputed from the input; without it, think() runs and its explain is returned.
export function explain(rawInput) {
  const input = asObject(rawInput);
  const report = think(input);
  const given = asObject(input.decision);
  if (Object.keys(given).length === 0) return report.explain;
  const decision = asObject(given.intervention).kind !== undefined ? given.intervention : given;
  const lifelog = enabledItems(input.lifelog, sourcesOf(input));
  return explainDecision(decision, {
    state: asObject(given.state).risk ? given.state : report.state,
    constraint: asObject(given.constraint).constraint ? given.constraint : report.constraint,
    lifelog,
    checkins: checkinRecords(input.checkins),
    week: report.context.week,
    today: report.context.today,
  });
}

// think input -> { readiness, ledger, goal: { state, chosenPathId, pathTitle, arcStart, version, milestones },
//                  today, trace }
// The "success -> work" view of one brain pass: the evidence shelf and the job-readiness score with
// the gates they rest on. Same determinism and same inputs as think(); nothing is stored.
export function jobReadiness(rawInput) {
  const report = think(rawInput);
  const { state, chosenPathId, pathTitle, arcStart, version, milestones: gates } = report.goal;
  return {
    readiness: report.readiness,
    ledger: report.ledger,
    goal: { state, chosenPathId, pathTitle, arcStart, version, milestones: gates },
    today: report.context.today,
    trace: report.trace.filter((entry) => entry.fn === 'buildLedger' || entry.fn === 'readinessScore'),
  };
}

export default { think, rankRoles, planWeek, checkIn, analyzeState, explain, jobReadiness, loadScenario };
