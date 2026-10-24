// constraint.js — Decision Brain: "the one thing blocking progress right now" (TOC + COM-B).
// Pure and deterministic. Reads only what the person tapped: a Not-today reason chip on a
// check-in (`reason` / `blocker_reason`) or a lifelog item's `blocker_reason`. With no
// reasons the answer is 'unknown' — nothing is guessed from condition or activity.
// Rules: context/ALGORITHM_DESIGN_v1.md §3.4 (recency-weighted argmax, one constraint at a time).

import { isIsoDate, daysBetween, resolveCheckinDate, checkinId } from './state.js';

// Reason chip -> COM-B constraint.
export const BLOCKER_MAP = {
  time: 'opportunity-time',
  energy: 'motivation-automatic',
  mood: 'motivation-automatic',
  skill: 'capability',
  people: 'opportunity-social',
};
// Roadmap reason names from §4.1 map onto the five chips.
export const BLOCKER_ALIASES = {
  no_time: 'time',
  low_energy: 'energy',
  didnt_feel: 'mood',
  dont_know_how: 'skill',
  waiting_on_someone: 'people',
};
export const CONSTRAINTS = [
  'capability',
  'opportunity-time',
  'opportunity-social',
  'motivation-reflective',
  'motivation-automatic',
  'unknown',
];

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));
const round4 = (n) => Math.round((n + Number.EPSILON) * 10000) / 10000;

// One reason chip -> one COM-B constraint; anything unrecognised is 'unknown'.
export function classifyBlocker(reason) {
  const key = asText(reason).trim().toLowerCase().replace(/[\s-]+/g, '_');
  const chip = BLOCKER_ALIASES[key] || key;
  return BLOCKER_MAP[chip] || 'unknown';
}

// Today weighs 1, a week ago 1/8, two weeks ago 1/15.
export function recencyWeight(ageDays) {
  const age = Number.isFinite(ageDays) && ageDays > 0 ? ageDays : 0;
  return 1 / (1 + age);
}

function reasonOf(record) {
  return record.reason ?? record.blocker_reason ?? record.not_today_reason ?? null;
}

// { checkins, lifelog, today? } -> { constraint, score, evidence: [ids], scores, signals, reason }
// evidence lists the ids (lifelog `id`, check-in `id` or "<actionId>@<date|day>") that voted
// for the winning constraint, strongest first. A tie or no reasons -> 'unknown' (ask instead).
export function rootConstraint(history) {
  const input = history && typeof history === 'object' ? history : {};
  const checkins = asArray(input.checkins);
  const items = asArray(input.lifelog).filter((item) => item && typeof item === 'object');

  const eventDates = [
    ...items.map((i) => i.date),
    ...checkins.map((c) => (c && typeof c === 'object' ? c.date : null)),
  ].filter(isIsoDate);
  const todayDate = isIsoDate(input.today) ? input.today : eventDates.length > 0 ? eventDates.sort()[eventDates.length - 1] : null;

  const signals = [];
  let unknownCount = 0;

  checkins.forEach((checkin, index) => {
    if (!checkin || checkin.kind !== 'not_today') return;
    const reason = reasonOf(checkin);
    if (reason === null || reason === undefined || reason === '') return;
    const constraint = classifyBlocker(reason);
    if (constraint === 'unknown') { unknownCount += 1; return; }
    const date = resolveCheckinDate(checkin, todayDate);
    // Without a date the position in the check-in list stands in for age (newest last).
    const ageDays = date && todayDate ? daysBetween(date, todayDate) : checkins.length - 1 - index;
    signals.push({ id: checkinId(checkin), type: 'checkin', reason: asText(reason), constraint, date, ageDays, weight: recencyWeight(ageDays) });
  });

  for (const item of items) {
    const reason = item.blocker_reason;
    if (reason === null || reason === undefined || reason === '') continue;
    const constraint = classifyBlocker(reason);
    if (constraint === 'unknown') { unknownCount += 1; continue; }
    const ageDays = isIsoDate(item.date) && todayDate ? daysBetween(item.date, todayDate) : 0;
    signals.push({ id: asText(item.id), type: 'lifelog', reason: asText(reason), constraint, date: isIsoDate(item.date) ? item.date : null, ageDays, weight: recencyWeight(ageDays) });
  }

  const scores = {};
  for (const signal of signals) scores[signal.constraint] = round4((scores[signal.constraint] || 0) + signal.weight);

  if (signals.length === 0) {
    return { constraint: 'unknown', score: 0, evidence: [], scores, signals, reason: unknownCount > 0 ? 'reasons_unknown' : 'no_reasons' };
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const [best, bestScore] = ranked[0];
  const tied = ranked.filter(([, score]) => Math.abs(score - bestScore) < 1e-9).map(([name]) => name);
  if (tied.length > 1) {
    return { constraint: 'unknown', score: bestScore, evidence: [], scores, signals, reason: 'tie', tie: tied };
  }

  const evidence = signals
    .filter((s) => s.constraint === best)
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
    .map((s) => s.id);
  return { constraint: best, score: bestScore, evidence, scores, signals, reason: 'argmax' };
}
