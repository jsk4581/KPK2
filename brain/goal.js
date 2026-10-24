// goal.js — goal clarification (TheGoal): goal state, 12-week gates, the one next question, gate rules.
// Pure and deterministic: no DOM, no network, no clock. Dates are ISO arithmetic from a startDate the
// caller passes in. Nothing passes a gate automatically: evidence AND the user's confirm flag are both
// required (ALGORITHM_DESIGN_v1 §3.1, §3.3, §6.4). A check that could not run is reported as not passed.

export const GOAL_STATES = ['ambiguous', 'provisional', 'validated'];

// The four gates of the 12-week arc (§3.3). Order follows dependency, not interest.
export const GATE_TEMPLATES = [
  {
    id: 'M1',
    name: 'Fit',
    week: 2,
    outcome: 'First evidence that this path fits you',
    problemGate: 'What is this work actually like?',
    evidence: 'One conversation with someone doing it, or one sample in the target format',
    decision: ['continue', 'change-path'],
    minDone: 2,
  },
  {
    id: 'M2',
    name: 'Proof',
    week: 6,
    outcome: 'Proof that your past work transfers',
    problemGate: 'Does my past work translate into the target format?',
    evidence: 'Two or three reworked portfolio pieces and one piece of outside feedback',
    decision: ['continue', 'reframe-scope'],
    minDone: 6,
  },
  {
    id: 'M3',
    name: 'Market',
    week: 9,
    outcome: 'Contact with the market',
    problemGate: 'Who spends money or time on this?',
    evidence: 'Ten targeted outreaches, three conversations, one pilot or application',
    decision: ['continue', 'change-route'],
    minDone: 9,
  },
  {
    id: 'M4',
    name: 'Ready',
    week: 12,
    outcome: 'Ready to apply or pitch',
    problemGate: 'Does my story land in one telling?',
    evidence: 'Narrative, portfolio and five applications or pitches',
    decision: ['apply', 'extend'],
    minDone: 12,
  },
];

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

function dateOrdinal(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asText(date));
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000;
}

function ordinalToIso(ordinal) {
  return new Date(ordinal * 86400000).toISOString().slice(0, 10);
}

// ISO date + n days, or null when the date is not YYYY-MM-DD. No clock involved.
export function addDays(isoDate, days) {
  const ordinal = dateOrdinal(isoDate);
  if (ordinal === null || !Number.isFinite(Number(days))) return null;
  return ordinalToIso(ordinal + Math.round(Number(days)));
}

// Goal state (§3.1): no path -> ambiguous; path chosen -> provisional; any gate passed -> validated
// (validated-for-now: it is re-checked at every later gate). Check-ins alone do not change the state.
export function goalState(input) {
  const { chosenPathId, gates } = asObject(input);
  if (!asText(chosenPathId)) return 'ambiguous';
  const passed = asArray(gates).some((gate) => gate && typeof gate === 'object' && gate.passed === true);
  return passed ? 'validated' : 'provisional';
}

// Exactly four gates for a chosen path (a fallback path draft or a rankRoles entry).
// date = startDate + week * 7 days (the end of that week); null when startDate is not ISO.
export function milestones(path, startDate) {
  const draft = path && typeof path === 'object' ? path : {};
  const pathId = asText(draft.role_id || draft.id);
  const pathTitle = asText(draft.title || draft.role_title);
  return GATE_TEMPLATES.map((gate) => ({
    id: gate.id,
    name: gate.name,
    week: gate.week,
    date: addDays(startDate, gate.week * 7),
    outcome: gate.outcome,
    problemGate: gate.problemGate,
    evidence: gate.evidence,
    decision: [...gate.decision],
    minDone: gate.minDone,
    pathId,
    pathTitle,
    passed: false,
  }));
}

// Information-gain table for the one question (§3.1, §2.3). Keys are stable for messages/explain.
export const QUESTION_TABLE = {
  'future-state': {
    question: 'Twelve weeks from now, what would be different in an ordinary workday if this went well?',
    why: 'The goal is still ambiguous: a future-state picture separates competing directions faster than any other question.',
  },
  'tool-to-change': {
    question: 'What change would that tool make for a client — what is different for them afterwards?',
    why: 'The goal is ambiguous and the signals point at tools first: asking for the change brings the goal back in front of the tool.',
  },
  'blocker-this-week': {
    question: 'What blocked you most this week — time, energy, not knowing how, waiting on someone, or not feeling it?',
    why: 'The path is chosen but the bottleneck is unknown: naming it decides which intervention applies, so it has the highest information gain.',
  },
  'fit-conversation': {
    question: 'Who is one person already doing this work that you could talk to for twenty minutes?',
    why: 'The path is chosen and the bottleneck is known: the next unknown is whether the path fits, and one conversation is the M1 evidence.',
  },
  'market-check': {
    question: 'Who would spend money or time on this — can you name three people or teams?',
    why: 'The goal is validated for now: the next uncertainty is the market (M3), so the question moves there.',
  },
};

function constraintKnown(constraint) {
  if (constraint === null || constraint === undefined) return false;
  if (typeof constraint === 'string') return constraint !== '' && constraint !== 'unknown';
  if (typeof constraint === 'object') {
    const kind = asText(constraint.kind || constraint.type || constraint.id);
    return kind !== '' && kind !== 'unknown';
  }
  return false;
}

// One question, chosen by goal state and what is still unknown. Returns { key, question, why }.
export function nextQuestion(input) {
  const { person, goalState: state, constraint } = asObject(input);
  const archetype = asText(person && person.traits && person.traits.archetype);
  let key;
  if (state === 'validated') key = 'market-check';
  else if (state === 'provisional') key = constraintKnown(constraint) ? 'fit-conversation' : 'blocker-this-week';
  else key = archetype === 'tool-curious' ? 'tool-to-change' : 'future-state';
  return { key, ...QUESTION_TABLE[key] };
}

function doneCount(gate, { checkins, week }) {
  const records = asArray(checkins).filter((c) => c && c.kind === 'done');
  if (records.length > 0 || asArray(checkins).length > 0) {
    // A check-in may carry the arc week it happened in; without it the MVP's single week is assumed.
    return records.filter((c) => c.week === undefined || c.week === null || Number(c.week) <= gate.week).length;
  }
  return asArray(week && week.actions).filter((a) => a && a.status === 'done').length;
}

// Gate evaluation with reasons: { passed, gateId, done, required, confirmed, reasons[] }.
// Rule: done check-ins up to the gate's week >= minDone AND confirmed === true (the user's own
// "yes, this is working"). Missing inputs are reasons, never a pass.
export function evaluateGate(gate, context) {
  const template = asObject(gate);
  const ctx = asObject(context);
  const base = GATE_TEMPLATES.find((g) => g.id === template.id) || GATE_TEMPLATES[0];
  const required = template.minDone !== undefined && Number.isFinite(Number(template.minDone)) ? Number(template.minDone) : base.minDone;
  const week = template.week !== undefined && Number.isFinite(Number(template.week)) ? Number(template.week) : base.week;
  const done = doneCount({ week }, ctx);
  const confirmed = ctx.confirmed === true;
  const reasons = [];
  if (done < required) reasons.push('done_below_minimum');
  if (!confirmed) reasons.push('not_confirmed');
  return { passed: reasons.length === 0, gateId: asText(template.id || base.id), done, required, confirmed, reasons };
}

// Boolean form of evaluateGate for callers that only need the verdict.
export function gatePassed(gate, context) {
  return evaluateGate(gate, context).passed;
}
