// plan.js — if-then lines and the action fields of the 12-week plan (ALGORITHM_DESIGN §3.3, §4.1).
// Pure and deterministic: no clock, no network, no LLM. Never mutates the week it is given.
//
// withIfThen(week, { anchor, milestone, evidenceProduced, constraintTargeted }) -> a NEW week whose
// actions each carry:
//   ifThen             "On <day>[ after <anchor>], I will <title>"  ("Next week, …" for NextWeek)
//   milestone          "M1".."M4" (action's own valid value, else the option, else "M1")
//   evidenceProduced   action's own value, else the option, else null
//   constraintTargeted action's own value, else the option, else null
//   dependsOnPerson    true only when the action says so, else false
// The anchor is never guessed: without one the line names only the day. ids, status, minutes and
// every other field of an action stay as they were. An action's own `if_then` (LLM text) is replaced:
// the day may have moved since it was written, and the brain writes the if-then, not the LLM.
// The line is user-facing, so the title and the anchor (user or LLM text) enter it only when they
// pass messages.lint: a title that fails is replaced by a neutral phrase, an anchor that fails is dropped.

import { lint } from './messages.js';

export const MILESTONES = ['M1', 'M2', 'M3', 'M4'];
export const DEFAULT_MILESTONE = 'M1';
export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const NEXT_WEEK = 'NextWeek';
export const NEUTRAL_TITLE = 'take the planned step';

const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asArray = (value) => (Array.isArray(value) ? value : []);
const cleanText = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

// Anchor text as the person wrote it, minus any leading "after " so the line never says "after after".
function cleanAnchor(value) {
  const text = cleanText(value).replace(/^(after\s+)+/i, '');
  return text === '' || !lint(text).ok ? null : text;
}

function validMilestone(value) {
  return MILESTONES.includes(value) ? value : null;
}

// First value that was actually provided (not null/undefined), else null. Never invents one.
function provided(...values) {
  const hit = values.find((v) => v !== null && v !== undefined && v !== '');
  return hit === undefined ? null : hit;
}

// "On Tue" / "Next week" / "This week" (day unknown: no day is guessed).
function whenPhrase(day) {
  if (day === NEXT_WEEK) return 'Next week';
  if (WEEK_DAYS.includes(day)) return `On ${day}`;
  return 'This week';
}

// One action (+ optional anchor) -> the if-then sentence, or null when there is no title to commit to.
export function ifThenLine(action, anchor = null) {
  const a = asObject(action);
  const raw = cleanText(a.title);
  if (raw === '') return null;
  const title = lint(raw).ok ? raw : NEUTRAL_TITLE;
  const cue = cleanAnchor(anchor);
  return `${whenPhrase(a.day)}${cue ? ` after ${cue}` : ''}, I will ${title}`;
}

function planAction(action, opts) {
  const a = asObject(action);
  return {
    ...a,
    ifThen: ifThenLine(a, opts.anchor),
    milestone: validMilestone(a.milestone) ?? validMilestone(opts.milestone) ?? DEFAULT_MILESTONE,
    evidenceProduced: provided(a.evidenceProduced, a.evidence_produced, opts.evidenceProduced),
    constraintTargeted: provided(a.constraintTargeted, a.constraint_targeted, opts.constraintTargeted),
    dependsOnPerson: a.dependsOnPerson === true || a.depends_on_person === true,
  };
}

// week -> new week (same fields, new actions array of new action objects). Input is left untouched.
export function withIfThen(week, options = {}) {
  const source = asObject(week);
  const opts = asObject(options);
  return { ...source, actions: asArray(source.actions).map((action) => planAction(action, opts)) };
}

// One UI line for an action: "<if-then> · <minutes> min · <milestone>". Parts that are missing are
// left out; an action without a title gives ''. Works on actions that never went through withIfThen.
export function describePlanLine(action) {
  const a = asObject(action);
  const line = cleanText(a.ifThen) || ifThenLine(a);
  if (!line) return '';
  const minutes = Number(a.minutes);
  const parts = [line];
  if (Number.isFinite(minutes) && minutes > 0) parts.push(`${minutes} min`);
  const milestone = validMilestone(a.milestone);
  if (milestone) parts.push(milestone);
  return parts.join(' · ');
}

export default { withIfThen, describePlanLine, ifThenLine, MILESTONES, DEFAULT_MILESTONE, WEEK_DAYS, NEXT_WEEK };
