// person.js — "Who is this person": the Decision Brain's person model.
// Pure and deterministic: no DOM, no network, no clock, no sensors. Everything is derived from the
// three input fields, the enabled lifelog items and the skill dictionary; the archetype comes from
// keyword rules over fields.now / fields.pull only (ALGORITHM_DESIGN_v1 §2.3) and is a prior, not a
// label — two weeks of logs override it through constraint detection.
// Reuses Build's extractSkills (app/logic.js, read-only import) so skill evidence matches the screen.

import { extractSkills } from '../app/logic.js';

export const ARCHETYPES = ['pivot-with-runway', 'income-pressure', 'identity-grief', 'tool-curious', 'unknown'];
export const STAGES_OF_CHANGE = ['contemplation', 'preparation', 'action'];

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

// Person model. Input keys: fields {career, now, pull}, lifelog (enabled items), skills (dictionary),
// rankedRoles (rankRoles output, optional), chosenPathId (optional), checkins (optional).
// Output: { traits: { careerCapital: { knowHow, knowWhom, knowWhy, transfers }, archetype,
//           archetypeMatches, stageOfChange }, evidence: [lifelog ids] }. Never throws.
export function buildPersonModel(input) {
  const { fields, lifelog, skills, rankedRoles, chosenPathId, checkins } = input && typeof input === 'object' ? input : {};
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
      careerCapital: { knowHow, knowWhom, knowWhy, transfers },
      archetype,
      archetypeMatches: matches,
      stageOfChange: detectStageOfChange({ chosenPathId, checkins }),
    },
    // Lifelog ids in input order, each counted once.
    evidence: items.map((item) => asText(item.id)).filter((id, index, all) => evidence.has(id) && all.indexOf(id) === index),
  };
}
