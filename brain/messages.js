// messages.js — Decision Brain sentence policy. Deterministic templates, `{}` slots only.
// Every message is ack (one fact) -> reframe (one sentence of progress) -> smallest next step
// (<= 10–15 min). Autonomy language, two choices, no commands, no banned words, no "because you".
// Templates: context/ALGORITHM_DESIGN_v1.md §5.1–5.2. First lines reuse Build's constants.

import { REST_DAY_LINE, REFRAME_LINE, COMEBACK_LINE, SHORT_ACTION_MINUTES } from '../app/logic.js';

export const MESSAGE_KEYS = [
  'DONE',
  'REST',
  'REST_REPEAT',
  'CARRIED',
  'RECONNECT',
  'COMEBACK',
  'SHRINK',
  'GATE_PASS',
  'PLATEAU',
  'LOW_ENERGY',
  'NONE',
  'FULL',
];

// Banned phrasing. "not a missed day" (the rest-day line) is the one allowed exception.
export const BANNED_PATTERN = /\b(failed|failure|missed day|streak|should have|lazy|because you)\b/gi;
export const ALLOWED_PHRASE = /not a missed day/gi;

const asText = (value) => (value === null || value === undefined ? '' : String(value));

function num(value, fallback) {
  const n = Number(value);
  return value === null || value === undefined || value === '' || !Number.isFinite(n) ? fallback : n;
}

function str(value, fallback) {
  const s = asText(value).trim();
  return s === '' ? fallback : s;
}

// Fill missing slots with neutral text so a template never prints "undefined".
export function fillSlots(slots) {
  const s = slots && typeof slots === 'object' ? slots : {};
  return {
    action: str(s.action, "today's step"),
    minutes: num(s.minutes, null),
    done: num(s.done, 0),
    planned: num(s.planned, 3),
    showed_up: num(s.showed_up, 0),
    next_day: str(s.next_day, 'the next open day'),
    next_action: str(s.next_action, ''),
    next_min: num(s.next_min, SHORT_ACTION_MINUTES),
    moved_day: str(s.moved_day, 'Today'),
    micro_min: num(s.micro_min, SHORT_ACTION_MINUTES),
    micro_title: str(s.micro_title, 'the 10-minute version'),
    cond: num(s.cond, null),
    capacity: num(s.capacity, null),
    gate: str(s.gate, 'The first gate'),
    evidence: str(s.evidence, 'one piece of evidence is on the shelf'),
    next_gate: str(s.next_gate, 'the next gate'),
    weeks: num(s.weeks, 2),
    done_4w: num(s.done_4w, 0),
    question: str(s.question, ''),
  };
}

const progressLine = (s) => `${s.done}/${s.planned} done this week · ${s.showed_up} days showed up.`;

const TEMPLATES = {
  DONE: (s) => ({
    ack: `${s.action} — done.`,
    reframe: `${s.done}/${s.planned} this week · ${s.showed_up} days showed up.`,
    next: s.next_action ? `Next: ${s.next_day}, ${s.next_action} (${s.next_min} min).` : `Next: the next step is on ${s.next_day}; nothing to do until then.`,
  }),
  REST: (s) => ({
    ack: REST_DAY_LINE,
    reframe: s.done > 0 ? `${s.done}/${s.planned} are already done this week.` : REFRAME_LINE,
    next: `${s.moved_day}'s step moves to ${s.next_day} — ${s.micro_min} minutes is enough.`,
  }),
  REST_REPEAT: (s) => ({
    ack: 'Two rest days in a row usually means the week is heavier than the plan, not that you are.',
    reframe: `${progressLine(s)} All of it still counts.`,
    next: 'Keep 3 steps, or shrink to 2 this week? Your call.',
  }),
  CARRIED: (s) => ({
    ack: `${s.action} has moved for two weeks.`,
    reframe: 'That is information about the step, not a verdict on you.',
    next: 'One question: is it the wrong step, or the wrong size?',
  }),
  RECONNECT: (s) => ({
    ack: 'Welcome back.',
    reframe: `Nothing was lost — ${s.showed_up} days still count.`,
    next: `Today is a fresh page: one ${s.micro_min}-minute step, ${s.micro_title}?`,
  }),
  COMEBACK: (s) => ({
    ack: COMEBACK_LINE,
    reframe: progressLine(s),
    next: `The ${s.micro_min}-minute version is ready: ${s.micro_title}. The full version is there too if you want it.`,
  }),
  SHRINK: (s) => ({
    ack: s.capacity !== null ? `Today has about ${s.capacity} minutes in it.` : 'Today looks shorter than the plan.',
    reframe: 'A smaller step still moves the plan; size follows energy.',
    next: s.minutes !== null
      ? `${s.micro_title} (≤${s.micro_min} min), or the full version (${s.minutes} min) — your call.`
      : `${s.micro_title} (≤${s.micro_min} min), or the full version — your call.`,
  }),
  GATE_PASS: (s) => ({
    ack: `${s.gate} passed: ${s.evidence}.`,
    reframe: 'Your goal moved from draft to validated-for-now.',
    next: `Next gate: ${s.next_gate} in ${s.weeks} weeks.`,
  }),
  PLATEAU: (s) => ({
    ack: `You've done ${s.done_4w} steps in 4 weeks — real work.`,
    reframe: "None turned into evidence yet, so next week's steps are reshaped to produce one.",
    next: `First one: ${s.micro_title} (${s.micro_min} min).`,
  }),
  LOW_ENERGY: (s) => ({
    ack: s.cond !== null ? `Energy ${s.cond}/5 today.` : 'Energy is low today.',
    reframe: 'Rest is part of the plan, not a detour from it.',
    next: `Two options: rest and move ${s.action} to ${s.next_day}, or the ${s.micro_min}-minute version — ${s.micro_title}.`,
  }),
  NONE: (s) => ({
    ack: 'Nothing is scheduled today.',
    reframe: `${s.showed_up} days showed up so far; a day off is part of the plan.`,
    next: `If you want, ${s.micro_title} takes ${s.micro_min} minutes. Otherwise, see you ${s.next_day}.`,
  }),
  FULL: (s) => ({
    ack: s.minutes !== null ? `Today: ${s.action} (${s.minutes} min).` : `Today: ${s.action}.`,
    reframe: progressLine(s),
    next: 'Done, or not today — both keep the plan moving.',
  }),
};

// Text -> { ok, hits[] }. Case-insensitive; the literal "not a missed day" is allowed.
export function lint(text) {
  const source = Array.isArray(text) ? text.map(asText).join('\n') : asText(text);
  const scrubbed = source.replace(ALLOWED_PHRASE, '');
  const hits = [...scrubbed.matchAll(BANNED_PATTERN)].map((m) => m[0]);
  return { ok: hits.length === 0, hits };
}

// Slots that carry text written by the user or the LLM (titles, gate names). Only these can bring a
// banned phrase into a message; numbers and day names cannot.
export const TEXT_SLOTS = ['action', 'next_action', 'micro_title', 'next_day', 'moved_day', 'gate', 'evidence', 'next_gate', 'question'];

// Fill slots, then replace any text slot that fails lint with its neutral default so the sentence
// stays clean without rewriting the person's words. Returns { slots, scrubbed: [slot names] }.
export function cleanSlots(slots) {
  const filled = fillSlots(slots);
  const neutral = fillSlots({});
  const scrubbed = [];
  for (const key of TEXT_SLOTS) {
    if (lint(filled[key]).ok) continue;
    filled[key] = neutral[key];
    scrubbed.push(key);
  }
  return { slots: filled, scrubbed };
}

// messageKey + slots -> { key, ack, reframe, next, text, lint: { ok, hits, scrubbed } }.
// Unknown keys render NONE. `lint` is run on the final text (never skipped); `scrubbed` names the
// text slots that were replaced by their neutral default before rendering.
export function render(messageKey, slots) {
  const key = Object.prototype.hasOwnProperty.call(TEMPLATES, messageKey) ? messageKey : 'NONE';
  const { slots: filled, scrubbed } = cleanSlots(slots);
  const parts = TEMPLATES[key](filled);
  const text = [parts.ack, parts.reframe, parts.next].filter(Boolean).join('\n');
  return { key, requestedKey: asText(messageKey), ...parts, text, lint: { ...lint(text), scrubbed } };
}

// Every key with the same slots — handy for tests and the [Why?] panel.
export function renderAll(slots) {
  return MESSAGE_KEYS.map((key) => render(key, slots));
}
