// evidence.js — Decision Brain "success -> work": the evidence ledger (ALGORITHM_DESIGN §7.1).
// Done check-ins become shelf entries with a résumé-style bullet; Not today never does.
// Pure and deterministic: no DOM, no network, no clock. `today` / `arcStart` are inputs.
// Bullets are template strings (English, past tense, concrete). No number is invented: the only
// digits that can appear are the ones already in the step's own title or in logged minutes.
// Data shapes: docs/logic-contract.md (week.actions {id, title, minutes, day, status, short},
// check-ins {actionId, kind, day}); brain-only optional fields on a check-in: `date` (ISO),
// `variant` ('micro' | 'full'), `minutes`, `milestone`, `week`, `artifact_type`, `skill`.
// Optional fields on an action (roadmap schema §4.1): `milestone`, `evidence_produced`,
// `artifact_type`, `skill_tags`.

import { GATE_TEMPLATES } from './goal.js';
import { lint } from './messages.js';
import { MICRO_MINUTES, checkinId, isIsoDate, resolveCheckinDate, daysBetween } from './state.js';

export const GATE_IDS = GATE_TEMPLATES.map((gate) => gate.id);
export const ENTRY_KINDS = ['done', 'micro'];

// What a done step produced (§7.1 artifact_type, plus `outreach` for M3 reach-outs and `step`
// for a done action that names no artifact). Classified from explicit fields first, then from
// the step's own title by phrase rules. Design prior (확인 필요).
export const ARTIFACT_TYPES = ['portfolio_piece', 'conversation', 'outreach', 'feedback', 'application', 'pitch', 'step'];

// Phrase rules, checked in this order; the first type with a hit wins.
export const ARTIFACT_RULES = [
  { type: 'application', phrases: ['apply to', 'apply for', 'application', 'submit'] },
  { type: 'pitch', phrases: ['pitch'] },
  { type: 'feedback', phrases: ['feedback', 'critique from', 'review from'] },
  { type: 'outreach', phrases: ['send ', 'message ', 'note to', 'email to', 'reach out', 'follow up', 'follow-up', 'dm '] },
  { type: 'conversation', phrases: ['call with', 'conversation', 'coffee', 'chat with', 'talk with', 'talk to', 'interview with', 'minute call'] },
  {
    type: 'portfolio_piece',
    phrases: ['write', 'draft', 'rewrite', 'redraft', 'rework', 'outline', 'sketch', 'page', 'story', 'portfolio', 'example', 'template', 'guide', 'checklist', 'list ', 'questions', 'case study', 'before/after', 'screenshot', 'map ', 'audit', 'tag ', 'rules'],
  },
];

// Present-tense first word of a step title -> past tense. Unknown verbs fall back to a
// "Completed the step" sentence rather than a guessed conjugation.
export const VERB_PAST = {
  write: 'Wrote', draft: 'Drafted', redraft: 'Redrafted', rewrite: 'Rewrote', rework: 'Reworked', revise: 'Revised',
  list: 'Listed', send: 'Sent', sketch: 'Sketched', pick: 'Picked', read: 'Read', gather: 'Gathered', collect: 'Collected',
  turn: 'Turned', offer: 'Offered', repackage: 'Repackaged', message: 'Messaged', outline: 'Outlined', map: 'Mapped',
  audit: 'Audited', run: 'Ran', build: 'Built', make: 'Made', create: 'Created', record: 'Recorded', review: 'Reviewed',
  update: 'Updated', name: 'Named', tag: 'Tagged', mark: 'Marked', save: 'Saved', reach: 'Reached', ask: 'Asked',
  talk: 'Talked', call: 'Called', email: 'Emailed', post: 'Posted', publish: 'Published', apply: 'Applied',
  submit: 'Submitted', pitch: 'Pitched', prepare: 'Prepared', practice: 'Practiced', research: 'Researched',
  note: 'Noted', highlight: 'Highlighted', screenshot: 'Captured', test: 'Tested', ship: 'Shipped', finish: 'Finished',
  start: 'Started', set: 'Set', plan: 'Planned', schedule: 'Scheduled', book: 'Booked', share: 'Shared',
  compare: 'Compared', choose: 'Chose', find: 'Found', interview: 'Interviewed', teach: 'Taught', design: 'Designed',
  edit: 'Edited', polish: 'Polished', open: 'Opened', reply: 'Replied', answer: 'Answered', follow: 'Followed',
  define: 'Defined', describe: 'Described', explain: 'Explained', summarize: 'Summarized', translate: 'Translated',
  convert: 'Converted', adapt: 'Adapted', rename: 'Renamed', fix: 'Fixed', tighten: 'Tightened', shorten: 'Shortened',
  cut: 'Cut', add: 'Added', remove: 'Removed', move: 'Moved', print: 'Printed', scan: 'Scanned', label: 'Labeled',
  sort: 'Sorted', group: 'Grouped', rank: 'Ranked', score: 'Scored', grade: 'Graded', check: 'Checked', time: 'Timed',
  log: 'Logged', track: 'Tracked', measure: 'Measured', count: 'Counted', watch: 'Watched', listen: 'Listened',
  attend: 'Attended', join: 'Joined', visit: 'Visited', meet: 'Met', host: 'Hosted', lead: 'Led', present: 'Presented',
  dm: 'Messaged',
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

function isMicro(checkin) {
  if (checkin.variant === 'micro') return true;
  const minutes = Number(checkin.minutes);
  return Number.isFinite(minutes) && minutes > 0 && minutes <= MICRO_MINUTES;
}

function loggedMinutes(checkin) {
  const minutes = Number(checkin.minutes);
  return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null;
}

function emptyByGate() {
  return Object.fromEntries(GATE_IDS.map((id) => [id, 0]));
}

// ---------- classification ----------

// Artifact type: explicit field on the check-in or the action wins; otherwise phrase rules on the
// title; otherwise 'step'.
export function classifyArtifact(title, explicit) {
  const given = asText(explicit).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (ARTIFACT_TYPES.includes(given)) return given;
  const text = ` ${asText(title).toLowerCase()} `;
  for (const rule of ARTIFACT_RULES) {
    if (rule.phrases.some((phrase) => text.includes(phrase))) return rule.type;
  }
  return 'step';
}

// Gate id for an arc week number (1-based): M1 through week 2, M2 through 6, M3 through 9, else M4.
export function gateForWeek(week) {
  const n = Number(week);
  if (!Number.isFinite(n)) return null;
  const hit = GATE_TEMPLATES.find((gate) => n <= gate.week);
  return hit ? hit.id : GATE_IDS[GATE_IDS.length - 1];
}

// Gate for an entry: explicit `milestone` (check-in, then action) > check-in `week` > the arc
// week of the entry date from `arcStart` > M1 (the first gate; nothing later is assumed).
export function gateFor({ checkin, action, date, arcStart }) {
  for (const value of [asObject(checkin).milestone, asObject(action).milestone]) {
    const id = asText(value).trim().toUpperCase();
    if (GATE_IDS.includes(id)) return id;
  }
  const byWeek = gateForWeek(asObject(checkin).week);
  if (byWeek) return byWeek;
  if (isIsoDate(arcStart) && isIsoDate(date)) {
    const days = daysBetween(arcStart, date);
    if (days !== null && days >= 0) return gateForWeek(Math.floor(days / 7) + 1);
  }
  return GATE_IDS[0];
}

// ---------- skill label ----------

function skillName(id, skills) {
  const found = asArray(skills).find((skill) => skill && asText(skill.id) === id);
  const name = asText(found && found.name).trim();
  return name || id.replace(/[-_]+/g, ' ');
}

// Skill id for an entry: explicit on the check-in or the action, else the most frequent tag of the
// linked lifelog items (tags that belong to the chosen path's `requires` are preferred); ties
// break alphabetically. Null when nothing is known — never guessed from the title.
export function inferSkill({ checkin, action, linked, path, skills }) {
  const explicit = [asObject(checkin).skill, asObject(action).skill, ...asArray(asObject(action).skill_tags)].map(asText).map((s) => s.trim()).find(Boolean);
  if (explicit) return explicit;
  const known = new Set(asArray(skills).map((skill) => asText(skill && skill.id)).filter(Boolean));
  const requires = new Set(asArray(asObject(path).requires).map(asText));
  const counts = new Map();
  for (const item of linked) {
    for (const tag of new Set(asArray(item.tags).map(asText).filter(Boolean))) {
      if (known.size > 0 && !known.has(tag)) continue;
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  if (counts.size === 0) return null;
  const ranked = [...counts.entries()].sort((a, b) => {
    const prefer = Number(requires.has(b[0])) - Number(requires.has(a[0]));
    if (prefer !== 0) return prefer;
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0] < b[0] ? -1 : 1;
  });
  return ranked[0][0];
}

// ---------- bullet ----------

// "Write a before/after page" -> "Wrote a before/after page"; unknown first verb -> quoted step.
export function pastTense(title) {
  const text = asText(title).trim().replace(/\s+/g, ' ').replace(/[.]+$/, '');
  if (!text) return '';
  const first = text.split(' ')[0];
  const key = first.toLowerCase().replace(/[^a-z]/g, '');
  const past = Object.prototype.hasOwnProperty.call(VERB_PAST, key) ? VERB_PAST[key] : null;
  if (!past) return `Completed the step "${text}"`;
  const rest = text.slice(first.length).trim();
  return rest ? `${past} ${rest}` : past;
}

// "Case studies" -> "case studies" mid-sentence; an all-caps first word ("UX writing") is kept.
const lowerFirst = (text) => {
  const s = asText(text).trim();
  if (!s) return s;
  const first = s.split(' ')[0];
  return /^[A-Z0-9&/]{2,}$/.test(first) ? s : s[0].toLowerCase() + s.slice(1);
};

// §7.1 form without the measurement slot: [past-tense step][ toward <path>][, demonstrating <skill>].
// For a micro step: "Started "<full title>"[ toward <path>] with a <logged-minute|short> step (<micro title>)[, demonstrating <skill>]".
export function buildBullet({ title, kind, microTitle, minutes, pathTitle, skill }) {
  const path = asText(pathTitle).trim();
  const demo = skill ? `, demonstrating ${lowerFirst(skill)}` : '';
  const toward = path ? ` toward ${path}` : '';
  if (kind === 'micro') {
    const size = minutes ? `${minutes}-minute` : 'short';
    const micro = asText(microTitle).trim().replace(/[.]+$/, '');
    const step = micro ? `a ${size} step (${lowerFirst(micro)})` : `a ${size} step`;
    return `Started "${asText(title).trim()}"${toward} with ${step}${demo}.`;
  }
  return `${pastTense(title)}${toward}${demo}.`;
}

function neutralBullet(pathTitle) {
  const path = asText(pathTitle).trim();
  return path ? `Completed one planned step toward ${path}.` : 'Completed one planned step.';
}

// ---------- ledger ----------

// { week, checkins, lifelog, path, today?, arcStart?, skills? }
// -> { entries: [{ id, date, actionId, title, kind, artifactType, gate, skill, bullet, evidence, scrubbed }],
//      count, byGate: { M1, M2, M3, M4 }, byType: { portfolio_piece, ... }, byKind: { done, micro } }
// Entries come only from `kind: 'done'` check-ins (a micro variant is kept and flagged); Not today
// never produces one. `evidence` lists the check-in id and the lifelog ids logged on the same date.
export function buildLedger(rawInput) {
  const input = asObject(rawInput);
  const week = asObject(input.week);
  const actions = asArray(week.actions).filter((a) => a && typeof a === 'object');
  const items = asArray(input.lifelog).filter((item) => item && typeof item === 'object');
  const path = asObject(input.path);
  const pathTitle = asText(path.title || path.role_title) || asText(week.pathTitle);
  const today = isIsoDate(input.today) ? input.today : null;
  const records = asArray(input.checkins).filter((c) => c && typeof c === 'object' && c.kind === 'done');

  // Arc start: explicit input, else the path's, else the earliest dated event (same reading as estimateState).
  const eventDates = [...items.map((i) => i.date), ...records.map((c) => c.date)].filter(isIsoDate).sort();
  const arcStart = [input.arcStart, input.arc_start, path.arc_start].find(isIsoDate) || (eventDates.length > 0 ? eventDates[0] : null);

  const entries = records.map((checkin, index) => {
    const actionId = asText(checkin.actionId);
    const action = actions.find((a) => asText(a.id) === actionId) || null;
    const date = isIsoDate(checkin.date) ? checkin.date : resolveCheckinDate(checkin, today);
    const title = asText(action && action.title).trim() || `Step ${actionId || index + 1}`;
    const kind = isMicro(checkin) ? 'micro' : 'done';
    const linked = date ? items.filter((item) => item.date === date) : [];
    const skillId = inferSkill({ checkin, action, linked, path, skills: input.skills });
    const explicitType = checkin.artifact_type || (action && (action.artifact_type || action.evidence_produced));
    const artifactType = classifyArtifact(title, explicitType);
    const draft = buildBullet({
      title,
      kind,
      microTitle: asText(action && action.short),
      minutes: loggedMinutes(checkin),
      pathTitle,
      skill: skillId ? skillName(skillId, input.skills) : null,
    });
    const scrubbed = !lint(draft).ok;
    const evidence = [
      checkinId(checkin),
      ...linked.map((item) => asText(item.id)).filter(Boolean).sort(),
    ];
    return {
      id: `ev:${checkinId(checkin)}`,
      date,
      actionId,
      title,
      kind,
      artifactType,
      gate: gateFor({ checkin, action, date, arcStart }),
      skill: skillId,
      bullet: scrubbed ? neutralBullet(pathTitle) : draft,
      evidence,
      scrubbed,
      index,
    };
  });

  // Date order (undated last), then input order; `index` was only needed for this sort.
  entries.sort((a, b) => {
    const left = a.date || '9999-99-99';
    const right = b.date || '9999-99-99';
    if (left !== right) return left < right ? -1 : 1;
    return a.index - b.index;
  });
  for (const entry of entries) delete entry.index;

  const byGate = emptyByGate();
  const byType = Object.fromEntries(ARTIFACT_TYPES.map((type) => [type, 0]));
  const byKind = { done: 0, micro: 0 };
  for (const entry of entries) {
    byGate[entry.gate] += 1;
    byType[entry.artifactType] += 1;
    byKind[entry.kind] += 1;
  }
  return { entries, count: entries.length, byGate, byType, byKind, arcStart };
}
