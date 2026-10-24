// policy.js — Decision Brain intervention policy (JITAI + EAST): "today, which one action,
// how big, and framed how". Pure and deterministic. Exactly one action per day.
// Rules: context/ALGORITHM_DESIGN_v1.md §4.4–4.6. Reuses Build's helpers from app/logic.js
// (checkableActions, sizeForCondition, applyCheckin) instead of re-implementing them.

import { WEEK_DAYS, NEXT_WEEK, SHORT_ACTION_MINUTES, checkableActions, sizeForCondition, applyCheckin } from '../app/logic.js';
import { isIsoDate, weekdayOf, validCondition, capacityMinutes } from './state.js';
import { lint } from './messages.js';

export const INTERVENTION_KINDS = ['full', 'shrink', 'rest', 'reconnect', 'comeback', 'gate', 'none'];
export const RECONNECT_GAP_DAYS = 4;
export const CARRIED_MOVES = 2;

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));
const dayIndex = (day) => WEEK_DAYS.indexOf(day);
const byId = (a, b) => asText(a.id).localeCompare(asText(b.id));
// A title written by the user or the LLM only reaches a sentence (choices, slots) when it passes lint;
// otherwise the neutral wording stands in. The action itself (decision.action) keeps its own title.
const cleanTitle = (title, fallback) => (lint(title).ok ? asText(title) : fallback);

// `today` may be an ISO date or a weekday; falls back to week.today (set by buildWeek).
export function resolveWeekday(today, week) {
  if (isIsoDate(today)) return weekdayOf(today);
  if (dayIndex(today) >= 0) return today;
  const fromWeek = week && typeof week === 'object' ? week.today : null;
  return dayIndex(fromWeek) >= 0 ? fromWeek : null;
}

// The one action for today: assigned to today, else the nearest overdue one (moved first),
// else none. Future actions are not "today". -> { action, reason, upcoming }
export function pickTodayAction(week, todayWeekday) {
  const list = checkableActions(week);
  if (list.length === 0) return { action: null, reason: 'no_checkable_action', upcoming: null };
  const t = dayIndex(todayWeekday);
  if (t < 0) return { action: null, reason: 'today_unknown', upcoming: null };

  const sameDay = list.filter((a) => a.day === todayWeekday).sort(byId);
  if (sameDay.length > 0) return { action: sameDay[0], reason: 'assigned_today', upcoming: null };

  const overdue = list
    .filter((a) => dayIndex(a.day) < t)
    .sort((a, b) => (b.status === 'moved') - (a.status === 'moved') || dayIndex(b.day) - dayIndex(a.day) || byId(a, b));
  if (overdue.length > 0) {
    return { action: overdue[0], reason: overdue[0].status === 'moved' ? 'moved_overdue' : 'overdue', upcoming: null };
  }

  const upcoming = list.filter((a) => dayIndex(a.day) > t).sort((a, b) => dayIndex(a.day) - dayIndex(b.day) || byId(a, b));
  return { action: null, reason: 'no_action_today', upcoming: upcoming[0] || null };
}

// Build's 10-minute view of one action (condition 1 forces the reduced version).
export function microView(week, actionId) {
  return sizeForCondition(week, 1).find((a) => a.id === actionId) || null;
}

// Where a Not today would move the action, by actually running Build's applyCheckin.
export function moveTarget(week, actionId, todayWeekday) {
  const result = applyCheckin(week, actionId, 'not_today', todayWeekday);
  if (!result.ok || !result.adjustment) return { day: null, label: 'the next open day' };
  const day = result.adjustment.toDay;
  return { day, label: day === NEXT_WEEK ? 'next week' : day };
}

function normalizeInput(a, b, c, d, e) {
  // decideIntervention({state, constraint, week, today, checkins}) or the positional form
  // decideIntervention(state, constraint, week, today, checkins) from BRAIN_ARCH_v2 §1.
  if (a && typeof a === 'object' && b === undefined && ('state' in a || 'week' in a)) return a;
  return { state: a, constraint: b, week: c, today: d, checkins: e };
}

// -> { kind, actionId, minutes, choices[2], messageKey, reasons[], variant, lead, day,
//      nextDay, constraint, action, slots }
export function decideIntervention(a, b, c, d, e) {
  const input = normalizeInput(a, b, c, d, e);
  const state = input.state && typeof input.state === 'object' ? input.state : {};
  const week = input.week && typeof input.week === 'object' ? input.week : { actions: [] };
  const constraint = input.constraint && typeof input.constraint === 'object' ? asText(input.constraint.constraint) || 'unknown' : 'unknown';
  const energy = validCondition(state.energy);
  const riskLevel = state.risk && typeof state.risk === 'object' ? asText(state.risk.level) : '';
  const capacityMin = Number.isFinite(Number(state.capacityMin)) ? Number(state.capacityMin) : capacityMinutes(energy);
  const dataGapDays = Number.isFinite(Number(state.dataGapDays)) && state.dataGapDays !== null ? Number(state.dataGapDays) : null;
  const todayWeekday = resolveWeekday(input.today, week);

  const actions = asArray(week.actions);
  const done = actions.filter((x) => x.status === 'done').length;
  const showedUp = asArray(state.features).filter((f) => f && f.logged).length;
  const records = asArray(input.checkins).filter((x) => x && (x.kind === 'done' || x.kind === 'not_today'));
  const lastCheckin = records.length > 0 ? records[records.length - 1] : null;
  const afterRest = week.pendingComeback === true || (lastCheckin !== null && lastCheckin.kind === 'not_today');

  const picked = pickTodayAction(week, todayWeekday);
  const reasons = [picked.reason];
  const baseSlots = { done, planned: actions.length, showed_up: showedUp, cond: energy, capacity: capacityMin, micro_min: SHORT_ACTION_MINUTES };

  if (!picked.action) {
    const upcoming = picked.upcoming;
    return {
      kind: 'none',
      actionId: null,
      minutes: 0,
      choices: ['Rest today', 'Log one line (1 min)'],
      messageKey: 'NONE',
      reasons,
      variant: null,
      lead: 'rest_first',
      day: todayWeekday,
      nextDay: upcoming ? upcoming.day : null,
      constraint,
      action: null,
      slots: { ...baseSlots, next_day: upcoming ? upcoming.day : 'the next open day', micro_title: upcoming ? upcoming.short || upcoming.title : 'a one-line log' },
    };
  }

  const action = picked.action;
  const micro = microView(week, action.id) || { title: action.short || action.title, minutes: Math.min(SHORT_ACTION_MINUTES, action.minutes) };
  const next = moveTarget(week, action.id, todayWeekday);
  const actionTitle = cleanTitle(action.title, "today's step");
  const microTitle = cleanTitle(micro.title, 'the 10-minute version');
  const restChoice = `Rest today — moves to ${next.label}`;
  const microChoice = `${microTitle} (≤${SHORT_ACTION_MINUTES} min)`;
  const fullChoice = `Full version (${action.minutes} min)`;
  const slots = { ...baseSlots, action: actionTitle, minutes: action.minutes, micro_title: microTitle, micro_min: micro.minutes, next_day: next.label, moved_day: todayWeekday || 'Today' };

  let kind;
  let messageKey;
  let variant = 'micro';
  let lead = 'do';
  let choices;

  const lowEnergy = energy !== null && energy <= 2;
  const red = riskLevel === 'red';

  if (input.gate && typeof input.gate === 'object' && input.gate.passed === true) {
    kind = 'gate';
    messageKey = 'GATE_PASS';
    variant = 'full';
    choices = ['Done', 'Not today'];
    reasons.push('gate_passed');
    Object.assign(slots, { gate: input.gate.name, evidence: input.gate.evidence, next_gate: input.gate.next, weeks: input.gate.weeks });
  } else if (dataGapDays !== null && dataGapDays >= RECONNECT_GAP_DAYS) {
    kind = 'reconnect';
    messageKey = 'RECONNECT';
    choices = [microChoice, `Not yet — ${actionTitle} stays on ${action.day}`];
    reasons.push(`data_gap_days>=${RECONNECT_GAP_DAYS}`);
  } else if (lowEnergy || red) {
    lead = 'rest_first';
    choices = [restChoice, microChoice];
    if (lowEnergy) reasons.push('energy<=2');
    if (red) reasons.push('risk_red');
    kind = lowEnergy && red ? 'rest' : 'shrink';
    messageKey = lowEnergy ? 'LOW_ENERGY' : 'SHRINK';
  } else if (afterRest) {
    kind = 'comeback';
    messageKey = 'COMEBACK';
    choices = [microChoice, fullChoice];
    reasons.push('after_not_today');
  } else if (capacityMin < action.minutes) {
    kind = 'shrink';
    messageKey = 'SHRINK';
    choices = [microChoice, fullChoice];
    reasons.push('capacity<minutes');
  } else {
    kind = 'full';
    messageKey = 'FULL';
    variant = 'full';
    choices = ['Done', 'Not today'];
    reasons.push('capacity_ok');
  }

  // A step that keeps moving gets the one replanning question instead of another nudge.
  if ((Number(action.moves) || 0) >= CARRIED_MOVES && ['full', 'shrink', 'comeback'].includes(kind)) {
    messageKey = 'CARRIED';
    reasons.push(`moves>=${CARRIED_MOVES}`);
  }

  return {
    kind,
    actionId: action.id,
    minutes: variant === 'micro' ? micro.minutes : action.minutes,
    choices,
    messageKey,
    reasons,
    variant,
    lead,
    day: todayWeekday,
    nextDay: next.day,
    constraint,
    action: { id: action.id, title: action.title, short: action.short, minutes: action.minutes, day: action.day, status: action.status, moves: action.moves },
    slots,
  };
}
