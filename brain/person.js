// person.js — "Who is this person": the Decision Brain's person model.
// Pure and deterministic: no DOM, no network, no clock, no sensors. Everything is derived from the
// three input fields, the enabled lifelog items and the skill dictionary; the archetype comes from
// keyword rules over fields.now / fields.pull only (ALGORITHM_DESIGN_v1 §2.3) and is a prior, not a
// label — two weeks of logs override it through constraint detection.
// Reuses Build's extractSkills (app/logic.js, read-only import) so skill evidence matches the screen.
// Declared constraints and the adaptability 4C are validated passthroughs of what the person typed
// (ALGORITHM_DESIGN §2.1, §2.2): absent means null ("not measured ≠ 0"), and nothing is inferred from text.

import { extractSkills, FIELD_KEYS } from '../app/logic.js';

export const ARCHETYPES = ['pivot-with-runway', 'income-pressure', 'identity-grief', 'tool-curious', 'unknown'];
export const STAGES_OF_CHANGE = ['contemplation', 'preparation', 'action'];

// Declared constraints (§2.1): optional self-reported numbers / flag. Snake_case aliases follow the design doc.
export const CONSTRAINT_KEYS = ['hoursPerWeek', 'runwayMonths', 'careDuties'];
const CONSTRAINT_ALIASES = { hoursPerWeek: 'hours_per_week', runwayMonths: 'runway_months', careDuties: 'care_duties' };

// Savickas career adaptability (§1, §2.1): four 1–5 self-report scores. The label marks provenance
// so a consumer never mistakes a passthrough for a measured fact or an inference.
export const ADAPTABILITY_4C = ['concern', 'control', 'curiosity', 'confidence'];
export const ADAPTABILITY_LABEL = 'self-report';

// Longest verbatim phrase a careerCapital quote may carry.
export const QUOTE_MAX_CHARS = 80;

// Archetype keyword rules (§2.3). Each phrase matches case-insensitively at the start of a word
// ("afford" matches "affordable", "rate" does not match "accurate"). The archetype with the most
// matched phrases wins; a tie is broken by ARCHETYPE_PRECEDENCE (the more conservative tuning
// first — smaller steps are the safer wrong guess); zero matches -> 'unknown'.
export const ARCHETYPE_RULES = {
  // B. Needs money now; takes any work; hours are scarce -> micro steps by default, income-adjacent paths.
  'income-pressure': [
    'rent', 'bills', 'mortgage', 'debt', 'paycheck', 'money now', 'need money', 'need the money', 'afford',
    'income', 'lower rate', 'third of the rate', 'half the rate', 'rate cut', 'cut my rate', 'any job',
    'any client', 'any work', 'no savings', 'savings are gone', 'running out', 'evict',
  ],
  // C. Loss and anger language; wants reframing before instructions -> exploration first, one question at a time.
  'identity-grief': [
    'took my job', 'take my job', 'taking my job', 'replaced', 'replace me', 'start from zero', 'start over',
    'from scratch', 'scared', 'afraid', 'angry', 'anger', 'grief', 'grieving', 'mourn', 'worthless',
    'obsolete', 'no longer', 'nobody needs', 'pointless', 'wasted', 'stolen',
  ],
  // D. Already chasing tools; wants to be "the prompt person" -> ask what change the tool makes first.
  'tool-curious': [
    'prompt engineer', 'prompt expert', 'prompt engineering', 'become a prompt', 'ai tools', 'new tool',
    'new tools', 'latest tool', 'every tool', 'try every', 'automation', 'automate', 'no-code', 'copilot',
    'build a gpt', 'build an agent', 'ai agent', 'ai agents',
  ],
  // A. Has runway and curiosity; tends to over-plan -> strict step caps, evidence at the two-week gate.
  'pivot-with-runway': [
    'runway', 'savings', 'months saved', 'pivot', 'switch to', 'move into', 'transition', 'ux writing',
    'content strategy', 'content design', 'product marketing', 'curious about', 'explore', 'exploring',
    'time to figure', 'take my time',
  ],
};

export const ARCHETYPE_PRECEDENCE = ['income-pressure', 'identity-grief', 'tool-curious', 'pivot-with-runway'];

// Knowing-whom (DeFillippi & Arthur 1994): relationship labels found in the lifelog and the fields.
export const RELATIONSHIP_RULES = {
  client: ['client', 'retainer'],
  'former-client': ['former client', 'past client', 'old client'],
  founder: ['founder'],
  peer: ['peer', 'colleague', 'fellow'],
  'workshop-attendee': ['attendee', 'workshop attendee', 'past workshop'],
  referral: ['referral', 'referred'],
  'industry-contact': ['coffee chat', 'strategist', 'agency', 'recruiter', 'hiring manager'],
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Same matching rule as logic.js extractSkills: case-insensitive, anchored at the start of a word.
export function hasPhrase(haystack, phrase) {
  const word = asText(phrase).trim().toLowerCase();
  if (word === '') return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(word)}`, 'u').test(asText(haystack).toLowerCase());
}

function matchedPhrases(text, phrases) {
  return asArray(phrases).filter((phrase) => hasPhrase(text, phrase));
}

// Archetype from fields.now + fields.pull only. Returns { archetype, matches } where matches lists the
// phrases that fired per archetype (only non-empty entries) so explain() can show the rule.
export function detectArchetype(fields) {
  const source = fields && typeof fields === 'object' ? fields : {};
  const text = [asText(source.now), asText(source.pull)].join('\n');
  const matches = {};
  for (const archetype of ARCHETYPE_PRECEDENCE) {
    const hits = matchedPhrases(text, ARCHETYPE_RULES[archetype]);
    if (hits.length > 0) matches[archetype] = hits;
  }
  let best = 'unknown';
  let bestCount = 0;
  for (const archetype of ARCHETYPE_PRECEDENCE) {
    const count = (matches[archetype] || []).length;
    if (count > bestCount) {
      best = archetype;
      bestCount = count;
    }
  }
  return { archetype: best, matches };
}

// Transtheoretical stage from product facts only (no inference from text):
// no path chosen -> contemplation; path chosen, no check-in yet -> preparation; any check-in -> action.
export function detectStageOfChange({ chosenPathId, checkins } = {}) {
  if (!asText(chosenPathId)) return 'contemplation';
  const records = asArray(checkins).filter((c) => c && (c.kind === 'done' || c.kind === 'not_today'));
  return records.length > 0 ? 'action' : 'preparation';
}

function itemText(item) {
  return [asText(item.title), asText(item.summary), ...asArray(item.tags).map(asText)].join(' \n ');
}

// Lifelog ids that support a skill: a tag equal to the skill id, or a keyword in title/summary/tags.
function skillEvidence(skill, items) {
  const id = asText(skill.id);
  return items
    .filter((item) => asArray(item.tags).map(asText).includes(id) || asArray(skill.keywords).some((k) => hasPhrase(itemText(item), k)))
    .map((item) => asText(item.id));
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function nonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

// Declared constraints: validated passthrough only. A finite number >= 0 (hours, months) or a boolean
// (care duties) passes unchanged — an explicit 0 is a declared zero. Anything else, including absence,
// is null: "not measured ≠ 0" (§2.2). Nothing is read from the free-text fields.
export function validateConstraints(raw) {
  const source = isObject(raw) ? raw : {};
  const pick = (key) => source[key] ?? source[CONSTRAINT_ALIASES[key]];
  const careDuties = pick('careDuties');
  return {
    hoursPerWeek: nonNegativeNumber(pick('hoursPerWeek')),
    runwayMonths: nonNegativeNumber(pick('runwayMonths')),
    careDuties: typeof careDuties === 'boolean' ? careDuties : null,
  };
}

function scaleScore(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

// Adaptability 4C: each C is a self-reported integer 1–5 passed through unchanged; anything else
// (absent, 0, 6, 3.5, "3") is null. Never estimated from text — the label says where the values came from.
export function validateAdaptability(raw) {
  const source = isObject(raw) ? raw : {};
  const scores = {};
  for (const key of ADAPTABILITY_4C) scores[key] = scaleScore(source[key]);
  return { ...scores, label: ADAPTABILITY_LABEL };
}

// First word-anchored, case-insensitive occurrence of phrase in text (same rule as hasPhrase, with
// positions). Returns { index: -1, length: 0 } when absent.
function phraseIndex(text, phrase) {
  const word = asText(phrase).trim();
  if (word === '') return { index: -1, length: 0 };
  const match = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(word)})`, 'iu').exec(asText(text));
  return match ? { index: match.index + match[1].length, length: match[2].length } : { index: -1, length: 0 };
}

const isBoundary = (ch) => /[.!?\n]/.test(ch);
const isSpace = (ch) => /\s/.test(ch);

// Verbatim excerpt (<= max chars) of text around the match [index, index + length): the whole sentence
// when it fits, otherwise a window around the match that never starts or stops inside a word.
// The result is always a substring of text — no paraphrase, no ellipsis.
export function excerpt(text, index, length, max = QUOTE_MAX_CHARS) {
  const source = asText(text);
  const end = index + length;
  let start = index;
  while (start > 0 && !isBoundary(source[start - 1])) start--;
  let stop = end;
  while (stop < source.length && !isBoundary(source[stop])) stop++;
  if (stop < source.length && source[stop] !== '\n') stop++; // keep the closing punctuation
  let from = start;
  let to = stop;
  if (to - from > max) {
    const room = Math.max(0, max - length);
    const before = Math.floor(room / 2);
    from = Math.max(start, index - before);
    to = Math.min(stop, end + (room - before));
    while (from < index && from > start && !isSpace(source[from - 1])) from++;
    while (to > end && to < stop && !isSpace(source[to])) to--;
  }
  return source.slice(from, to).trim().slice(0, max);
}

// careerCapital.quotes: for every knowing-how skill id, the field name plus a short verbatim phrase from
// each of the three fields that evidenced it (§2.2 "keep the original wording", done by rule, not LLM).
// One quote per field, from the first dictionary keyword found there. A skill evidenced only by the
// lifelog keeps an empty list — its lifelog ids are already in evidence[].
export function skillQuotes(fields, skills, knowHow) {
  const source = isObject(fields) ? fields : {};
  const byId = new Map(asArray(skills).filter((skill) => isObject(skill) && skill.id).map((skill) => [asText(skill.id), skill]));
  const quotes = {};
  for (const id of asArray(knowHow).map(asText)) {
    quotes[id] = [];
    const skill = byId.get(id);
    if (!skill) continue;
    for (const field of FIELD_KEYS) {
      const text = asText(source[field]);
      for (const keyword of asArray(skill.keywords)) {
        const { index, length } = phraseIndex(text, keyword);
        if (index < 0) continue;
        quotes[id].push({ field, quote: excerpt(text, index, length) });
        break;
      }
    }
  }
  return quotes;
}

// Person model. Input keys: fields {career, now, pull}, lifelog (enabled items), skills (dictionary),
// rankedRoles (rankRoles output, optional), chosenPathId (optional), checkins (optional),
// constraints {hoursPerWeek, runwayMonths, careDuties} (optional, self-declared),
// adaptability4c {concern, control, curiosity, confidence} (optional, self-report 1–5).
// Output: { traits: { careerCapital: { knowHow, knowWhom, knowWhy, transfers, quotes }, constraints,
//           adaptability4c, archetype, archetypeMatches, stageOfChange }, evidence: [lifelog ids] }.
// Never throws.
export function buildPersonModel(input) {
  const raw = isObject(input) ? input : {};
  const { fields, lifelog, skills, rankedRoles, chosenPathId, checkins } = raw;
  const source = fields && typeof fields === 'object' ? fields : {};
  const items = asArray(lifelog).filter((item) => item && typeof item === 'object');
  const dictionary = asArray(skills).filter((skill) => skill && typeof skill === 'object' && skill.id);

  // knowing-how: skills with evidence in the fields or the lifelog (Build's rule, same output as the screen).
  const knowHow = extractSkills(source, items, dictionary);

  // knowing-why: skills named in what pulls them (fields.pull only) — the "why" behind a path.
  const knowWhy = extractSkills({ career: '', now: '', pull: asText(source.pull) }, [], dictionary);

  // knowing-whom: relationship labels with evidence in the lifelog or the fields.
  const fieldText = ['career', 'now', 'pull'].map((key) => asText(source[key])).join('\n');
  const knowWhom = [];
  const evidence = new Set();
  for (const [label, phrases] of Object.entries(RELATIONSHIP_RULES)) {
    const fromItems = items.filter((item) => matchedPhrases(itemText(item), phrases).length > 0);
    if (fromItems.length > 0 || matchedPhrases(fieldText, phrases).length > 0) {
      knowWhom.push(label);
      for (const item of fromItems) evidence.add(asText(item.id));
    }
  }
  knowWhom.sort();

  for (const skill of dictionary) {
    if (!knowHow.includes(asText(skill.id))) continue;
    for (const id of skillEvidence(skill, items)) evidence.add(id);
  }

  // What transfers: the union of transfers across the ranked roles, limited to skills with evidence.
  const transfers = [...new Set(asArray(rankedRoles).flatMap((role) => asArray(role && role.transfers).map(asText)))]
    .filter((id) => knowHow.includes(id))
    .sort();

  const { archetype, matches } = detectArchetype(source);

  return {
    traits: {
      careerCapital: { knowHow, knowWhom, knowWhy, transfers, quotes: skillQuotes(source, dictionary, knowHow) },
      // Self-declared inputs only; absent -> null, never 0 and never read from the text.
      constraints: validateConstraints(raw.constraints),
      adaptability4c: validateAdaptability(raw.adaptability4c ?? raw.adaptability_4c),
      archetype,
      archetypeMatches: matches,
      stageOfChange: detectStageOfChange({ chosenPathId, checkins }),
    },
    // Lifelog ids in input order, each counted once.
    evidence: items.map((item) => asText(item.id)).filter((id, index, all) => evidence.has(id) && all.indexOf(id) === index),
  };
}
