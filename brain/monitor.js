// monitor.js — plan versus reality: week comparison, drift and plateau detection, the weekly review.
// Pure and deterministic: no DOM, no network, no clock (`today` and condition history come in as
// inputs). Uses Build's data shapes (docs/logic-contract.md): week {actions:[{id,title,minutes,day,
// status,moves,short}]}, check-ins [{actionId, kind, day, date?}], lifelog items [{id,date,...}].
// Rules follow ALGORITHM_DESIGN_v1 §4.5 (rest-day), §6.1 (weekly review), §6.2 (drift, plateau),
// §6.5 (escalation: crisis language, economic pressure, low condition, red risk).
// Moved steps are moved, never deleted; nothing here uses the banned words.

import { WEEK_DAYS, NEXT_WEEK, MAX_ACTION_MINUTES, SHORT_ACTION_MINUTES } from '../app/logic.js';

export const DRIFT_TYPES = ['repeated_move', 'all_moved', 'no_log', 'overload'];
export const RESIZE_UP_CAP_PCT = 20; // §4.4: grow by at most 20% per week; shrink immediately.
export const REPLAN_QUESTION = 'Is this the wrong step, or the wrong size?';
export const NO_LOG_GAP_DAYS = 4; // §4.5: gap_days >= 4 -> reconnect.
export const PLATEAU_MIN_CHECKINS = 3;
export const LOW_CONDITION_DAYS = 10; // §6.5: condition <= 2 on >= 10 of the last 14 days.
export const CONDITION_WINDOW_DAYS = 14;

// Fixed crisis-language list (§6.5). Matching is a case-insensitive substring test on free text.
// The matched phrase is never stored or echoed: the result carries only a reason and a message.
export const CRISIS_PHRASES = [
  'kill myself',
  'end my life',
  'suicide',
  'suicidal',
  'want to die',
  'better off dead',
  'hurt myself',
  'harm myself',
  'self-harm',
  'no reason to live',
  'end it all',
];

// Fixed economic-pressure list (§6.5-4: rent, eviction, unpaid bills). Matched on word boundaries
// (not substrings) so "current" or "parent" never trip "rent". Never stored or echoed either.
export const ECONOMIC_PHRASES = [
  'rent',
  'eviction',
  'evicted',
  "can't pay",
  'cannot pay',
  'overdue bills',
  'no money for',
];

export const ESCALATION_MESSAGES = {
  crisis_language:
    'This is more than a coaching app can hold, and we are pausing the plan for now. ' +
    'If you are in the US, you can call or text 988 (Suicide & Crisis Lifeline) at any hour. ' +
    'Elsewhere, please reach your local emergency number or a crisis line. You deserve a person right now.',
  economic_pressure:
    'Money pressure comes before any plan, and it says nothing about you or your effort. ' +
    'If you are in the US, unemployment insurance is claimed through your state workforce agency, and an American Job Center ' +
    '(free, found via CareerOneStop) can help with benefits, training, and paid work right away. ' +
    'The week stays at two steps at most, with income-related steps first.',
  low_condition_10_of_14:
    'Energy has been at 2 or lower on most days for two weeks. That may be beyond what a coaching app can help with — ' +
    'would you like to talk with a doctor or a counselor? The plan is reduced to one small step for now.',
  risk_red_2_weeks:
    'Two heavy weeks in a row. Would you like us to connect you with a person — a coach or a peer — ' +
    'and keep one 10-minute step until then?',
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const dayIndex = (day) => WEEK_DAYS.indexOf(day);

function dateOrdinal(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asText(date));
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000;
}

function actionsOf(week) {
  return asArray(week && week.actions).filter((a) => a && typeof a === 'object');
}

function checkinRecords(checkins) {
  return asArray(checkins).filter((c) => c && (c.kind === 'done' || c.kind === 'not_today'));
}

// Moves per action: the larger of week.actions[].moves and the not_today check-ins for that id.
function moveCounts(actions, records) {
  const counts = new Map();
  for (const action of actions) counts.set(asText(action.id), Number(action.moves) || 0);
  const fromCheckins = new Map();
  for (const record of records) {
    if (record.kind !== 'not_today') continue;
    const id = asText(record.actionId);
    fromCheckins.set(id, (fromCheckins.get(id) || 0) + 1);
  }
  for (const [id, n] of fromCheckins) counts.set(id, Math.max(counts.get(id) || 0, n));
  return counts;
}

// Check-ins within the last 7 days when both `today` and the record carry ISO dates; otherwise the
// whole list counts as "this week" (Build's check-ins only carry a weekday).
function recentRecords(records, today) {
  const todayOrdinal = dateOrdinal(today);
  if (todayOrdinal === null) return records;
  return records.filter((c) => {
    const ordinal = dateOrdinal(c.date);
    return ordinal === null || (todayOrdinal - ordinal >= 0 && todayOrdinal - ordinal <= 6);
  });
}

// Days since the latest dated lifelog item, or null when `today` or the log has no ISO date.
export function lifelogGapDays(lifelog, today) {
  const todayOrdinal = dateOrdinal(today);
  if (todayOrdinal === null) return null;
  const latest = asArray(lifelog)
    .map((item) => (item ? dateOrdinal(item.date) : null))
    .filter((ordinal) => ordinal !== null)
    .reduce((max, ordinal) => (max === null || ordinal > max ? ordinal : max), null);
  if (latest === null) return null;
  return Math.max(0, todayOrdinal - latest);
}

// Plan versus reality for one week. `today` is the demo weekday ("Thu") or an ISO date; never the clock.
// Optional `capacityMinutes` (declared or estimated available minutes) feeds the overload rule.
// Returns { onTrack, done, moved, planned, stale, drift[], plateau }.
export function compareWeek(input) {
  const { week, checkins, lifelog, today, capacityMinutes } = asObject(input);
  const actions = actionsOf(week);
  const records = checkinRecords(checkins);
  const planned = actions.length;
  const done = actions.filter((a) => a.status === 'done').length;
  const moved = actions.filter((a) => a.status === 'moved').length;
  const drift = [];

  // repeated_move: the same step moved twice or more (§4.5 -> replan question).
  for (const [id, moves] of moveCounts(actions, records)) {
    if (moves < 2) continue;
    const action = actions.find((a) => asText(a.id) === id);
    const title = action ? asText(action.title) : id;
    drift.push({ type: 'repeated_move', actionId: id, note: `${title || id} moved ${moves} times this week` });
  }

  // all_moved: every step of the week is moved, none done.
  if (planned > 0 && moved === planned) {
    drift.push({ type: 'all_moved', note: `All ${planned} steps moved this week; none done yet` });
  }

  // no_log: no lifelog entry for NO_LOG_GAP_DAYS days, or (without dates) no log and no check-in at all.
  const gap = lifelogGapDays(lifelog, today);
  if (gap !== null ? gap >= NO_LOG_GAP_DAYS : asArray(lifelog).length === 0 && records.length === 0) {
    drift.push({ type: 'no_log', note: gap !== null ? `No log entry for ${gap} days` : 'No log entry and no check-in yet' });
  }

  // overload: planned minutes above capacity, or two open steps landing on the same day.
  const openActions = actions.filter((a) => a.status !== 'done' && a.day !== NEXT_WEEK);
  const plannedMinutes = actions.reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
  const capacity = Number.isFinite(Number(capacityMinutes)) && capacityMinutes !== null ? Number(capacityMinutes) : planned * MAX_ACTION_MINUTES;
  if (plannedMinutes > capacity) {
    drift.push({ type: 'overload', note: `${plannedMinutes} planned minutes against ${capacity} available` });
  }
  const byDay = new Map();
  for (const action of openActions) byDay.set(action.day, (byDay.get(action.day) || 0) + 1);
  for (const [day, count] of byDay) {
    if (count >= 2) drift.push({ type: 'overload', note: `${count} steps land on ${day}` });
  }

  // plateau (§6.2): showing up without a single Done in the last 7 days.
  const recent = recentRecords(records, today);
  const plateau = recent.length >= PLATEAU_MIN_CHECKINS && !recent.some((c) => c.kind === 'done');

  // stale: a todo step whose weekday is already behind today's weekday (when today is a weekday).
  const todayIndex = dayIndex(today);
  const stale = todayIndex >= 0 ? actions.filter((a) => a.status === 'todo' && dayIndex(a.day) >= 0 && dayIndex(a.day) < todayIndex).map((a) => asText(a.id)) : [];

  return { onTrack: drift.length === 0 && !plateau && stale.length === 0, done, moved, planned, stale, drift, plateau };
}

// Free text (string or array) as lower-cased strings; curly apostrophes become straight ones.
function freeTexts(freeText) {
  return (Array.isArray(freeText) ? freeText : [freeText]).map((t) => asText(t).toLowerCase().replace(/[‘’]/g, "'"));
}

function containsCrisisLanguage(freeText) {
  return freeTexts(freeText).some((text) => text !== '' && CRISIS_PHRASES.some((phrase) => text.includes(phrase)));
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ECONOMIC_PATTERNS = ECONOMIC_PHRASES.map((phrase) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(phrase)}([^a-z0-9]|$)`));

function containsEconomicLanguage(freeText) {
  return freeTexts(freeText).some((text) => text !== '' && ECONOMIC_PATTERNS.some((pattern) => pattern.test(text)));
}

// Mean of the known condition values (1..5) in the window; null when none are known.
function conditionMean(values) {
  const known = asArray(values).map(Number).filter((v) => Number.isFinite(v) && v >= 1 && v <= 5);
  if (known.length === 0) return null;
  return known.reduce((sum, v) => sum + v, 0) / known.length;
}

function lowConditionDays(values) {
  return asArray(values)
    .slice(-CONDITION_WINDOW_DAYS)
    .map(Number)
    .filter((v) => Number.isFinite(v) && v <= 2).length;
}

function redTwoWeeks(state) {
  const history = asArray(state && state.riskHistory).map(asText);
  if (history.length >= 2) return history.slice(-2).every((level) => level === 'red');
  const current = asText(state && state.risk && state.risk.level);
  const previous = asText(state && state.previousRisk);
  return current === 'red' && previous === 'red';
}

// Escalation (§6.5): one signal at most, in priority order. Crisis language stops coaching first;
// economic pressure (rent, eviction, unpaid bills) comes right after it and points to resources.
export function detectEscalation(input) {
  const { state, freeText } = asObject(input);
  if (containsCrisisLanguage(freeText)) return { reason: 'crisis_language', message: ESCALATION_MESSAGES.crisis_language };
  if (containsEconomicLanguage(freeText)) return { reason: 'economic_pressure', message: ESCALATION_MESSAGES.economic_pressure };
  const conditions = asArray(state && state.conditions);
  if (conditions.length > 0 && lowConditionDays(conditions) >= LOW_CONDITION_DAYS) {
    return { reason: 'low_condition_10_of_14', message: ESCALATION_MESSAGES.low_condition_10_of_14 };
  }
  if (redTwoWeeks(state)) return { reason: 'risk_red_2_weeks', message: ESCALATION_MESSAGES.risk_red_2_weeks };
  return null;
}

// Typical step size of a week: the mean of its action minutes, clamped to 1..30 (30 when empty).
function typicalMinutes(actions) {
  const minutes = actions.map((a) => Number(a.minutes)).filter((m) => Number.isFinite(m) && m > 0);
  if (minutes.length === 0) return MAX_ACTION_MINUTES;
  const mean = Math.round(minutes.reduce((sum, m) => sum + m, 0) / minutes.length);
  return Math.min(MAX_ACTION_MINUTES, Math.max(1, mean));
}

// Resize rule (§6.1): 3/3 done with condition >= 3 -> up (minutes +20%, capped at 30);
// >= 2 done -> keep; 1 done -> down to 2 steps; 0 done -> down to 1 micro step.
// Unknown condition never grows the plan. `minutes` is the typical (mean) step size for next week.
// Returns { direction, pct, count, minutes, micro, why }.
export function resizePlan(input) {
  const { week, done, planned, condition } = asObject(input);
  const actions = actionsOf(week);
  const total = Number.isFinite(Number(planned)) ? Number(planned) : actions.length;
  const finished = Number.isFinite(Number(done)) ? Number(done) : actions.filter((a) => a.status === 'done').length;
  const current = typicalMinutes(actions);
  const keep = (why) => ({ direction: 'keep', pct: 0, count: Math.max(1, total), minutes: current, micro: false, why });

  if (total === 0) return keep('nothing planned');
  if (finished >= total) {
    if (condition === null || condition === undefined) return keep('all done, condition unknown: no growth without a condition reading');
    if (Number(condition) < 3) return keep('all done, condition below 3');
    const next = Math.min(MAX_ACTION_MINUTES, Math.round(current * (1 + RESIZE_UP_CAP_PCT / 100)));
    if (next <= current) return keep('all done, already at the 30-minute cap');
    const pct = Math.min(RESIZE_UP_CAP_PCT, Math.round(((next - current) / current) * 100));
    return { direction: 'up', pct, count: Math.min(3, total), minutes: next, micro: false, why: `all ${total} done with condition ${Number(condition)}: grow by ${pct}%` };
  }
  if (finished >= 2) return keep(`${finished}/${total} done: same size next week`);
  if (finished === 1) return { direction: 'down', pct: 0, count: 2, minutes: current, micro: false, why: '1 done: two steps next week, re-check the constraint' };
  return { direction: 'down', pct: 0, count: 1, minutes: SHORT_ACTION_MINUTES, micro: true, why: '0 done: one 10-minute step next week, one question instead of blame' };
}

function seedActions(actions, resize) {
  const open = actions.filter((a) => a.status !== 'done');
  const rank = (a) => (a.day === NEXT_WEEK ? 0 : a.status === 'moved' ? 1 : 2);
  const ordered = [...open].sort((a, b) => rank(a) - rank(b) || (Number(b.moves) || 0) - (Number(a.moves) || 0));
  return ordered.slice(0, Math.min(3, Math.max(1, resize.count))).map((a) => {
    const micro = resize.micro || a.status === 'moved';
    const title = asText(a.title);
    const short = asText(a.short) || title;
    const own = Number(a.minutes) > 0 ? Number(a.minutes) : resize.minutes;
    const grown = resize.direction === 'up' ? Math.round(own * (1 + resize.pct / 100)) : own;
    return {
      id: asText(a.id),
      title: micro ? short : title,
      minutes: micro ? Math.min(SHORT_ACTION_MINUTES, own) : Math.min(MAX_ACTION_MINUTES, grown),
      variant: micro ? 'micro' : 'full',
      carriedFrom: asText(a.day),
      moves: Number(a.moves) || 0,
    };
  });
}

// Condition for the review: mean of the last 7 known daily values when a history is given, else the
// state's current energy (1..5), else null (unknown).
function reviewCondition(state) {
  const history = asArray(state && state.conditions);
  if (history.length > 0) return conditionMean(history.slice(-7));
  const energy = Number(state && state.energy);
  return Number.isFinite(energy) && energy >= 1 && energy <= 5 ? energy : null;
}

// Weekly review (§6.1). Input: week, checkins, state (estimateState output; may carry `conditions`
// (last 14 daily values), `riskHistory` (weekly levels), `energy`), person (buildPersonModel output),
// optional `freeText` (user-typed notes scanned for crisis language), optional `today`, optional `lifelog`.
// Returns { resize, replanQuestion, replanActionId, escalate, nextWeekSeed: { actions }, compare }.
export function weeklyReview(input) {
  const { week, checkins, state, person, freeText, today, lifelog } = asObject(input);
  const actions = actionsOf(week);
  const compare = compareWeek({ week, checkins, lifelog, today });

  let resize = resizePlan({ week, done: compare.done, planned: compare.planned, condition: reviewCondition(state) });
  const capAtTwo = (why) => ({ direction: 'keep', pct: 0, count: 2, minutes: typicalMinutes(actions), micro: false, why });

  // §2.3 B: the income-pressure prior keeps the week at two steps at most (no growth either).
  const archetype = asText(person && person.traits && person.traits.archetype);
  if (archetype === 'income-pressure' && resize.count > 2) resize = capAtTwo('capped at 2 steps, same size (income-pressure prior)');

  const escalate = detectEscalation({ state, freeText });

  // One question at a time (§6.1): a step moved twice asks it; otherwise the first shrink to one
  // micro step (0 done) asks the same question instead of blame. An escalation message carries its
  // own sentence, so the shrink-driven question stays silent then.
  const repeated = compare.drift.find((d) => d.type === 'repeated_move');
  const firstShrink = resize.direction === 'down' && resize.count === 1 && !escalate;
  const replanQuestion = repeated || firstShrink ? REPLAN_QUESTION : null;

  if (escalate && escalate.reason === 'economic_pressure') {
    // §6.5-4: resources plus income first. The week keeps up to two steps (no growth) rather than
    // shrinking to one: money pressure is a reason to keep moving toward income, not to pause.
    if (resize.direction === 'up' || resize.count > 2) resize = capAtTwo('capped at 2 steps, same size (economic pressure: income first)');
  } else if (escalate) {
    // §6.5: the other escalations shrink the plan to one micro step; coaching pauses on crisis language.
    resize = { direction: 'down', pct: 0, count: 1, minutes: SHORT_ACTION_MINUTES, micro: true, why: `escalation: ${escalate.reason}` };
  }

  const seed = escalate && escalate.reason === 'crisis_language' ? [] : seedActions(actions, resize);

  return {
    resize,
    replanQuestion,
    replanActionId: repeated ? repeated.actionId : null,
    escalate,
    nextWeekSeed: { actions: seed },
    compare,
  };
}
