// person.test.mjs — person model: archetype keyword rules, stage of change, career capital, evidence.
// Run from brain/: node --test tests/   All fixtures are inline and synthetic ("Sample persona — synthetic").

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Module object, not named bindings: a missing export must fail one test, not the whole file.
import * as person from '../person.js';

const {
  buildPersonModel, detectArchetype, detectStageOfChange, validateConstraints, validateAdaptability, skillQuotes, excerpt, hasPhrase,
  ARCHETYPES, ARCHETYPE_RULES, ARCHETYPE_PRECEDENCE, STAGES_OF_CHANGE, CONSTRAINT_KEYS, ADAPTABILITY_4C, ADAPTABILITY_LABEL, QUOTE_MAX_CHARS,
} = person;

const NULL_CONSTRAINTS = { hoursPerWeek: null, runwayMonths: null, careDuties: null };
const NULL_ADAPTABILITY = { concern: null, control: null, curiosity: null, confidence: null, label: 'self-report' };

// Synthetic persona shipped with the app (fields, lifelog, skills, roles). Read-only.
const DANA = JSON.parse(readFileSync(new URL('../../app/data/persona-dana.json', import.meta.url), 'utf8'));

const SKILLS = [
  { id: 'discovery-call', name: 'Discovery interviews', keywords: ['discovery call', 'interview'] },
  { id: 'positioning', name: 'Positioning', keywords: ['positioning', 'message map'] },
  { id: 'workshop-facilitation', name: 'Teaching and workshops', keywords: ['workshop', 'teaching'] },
  { id: 'prompt-systems', name: 'Prompt and style systems', keywords: ['prompt library'] },
];

const LIFELOG = [
  { id: 'l1', date: '2026-10-12', source: 'calendar', title: 'Discovery call with a founder', summary: 'Ran a discovery call for a launch.', tags: ['discovery-call'], url: null, _label: 'synthetic' },
  { id: 'l2', date: '2026-10-13', source: 'note', title: 'Rate note', summary: 'A client asked for polish only at a lower rate.', tags: [], url: null, _label: 'synthetic' },
  { id: 'l3', date: '2026-10-14', source: 'messenger', title: 'Peer thread', summary: 'A peer copywriter shared a rubric.', tags: ['positioning'], url: null, _label: 'synthetic' },
  { id: 'l4', date: '2026-10-15', source: 'saved_link', title: 'Article on kettles', summary: 'Nothing career related here.', tags: [], url: null, _label: 'synthetic' },
];

const fields = (now, pull = '', career = '') => ({ career, now, pull });

describe('archetype keyword rules (fields.now + fields.pull only)', () => {
  test('rule table covers the four named archetypes and the precedence order is complete', () => {
    assert.deepEqual(Object.keys(ARCHETYPE_RULES).sort(), ['identity-grief', 'income-pressure', 'pivot-with-runway', 'tool-curious']);
    assert.deepEqual([...ARCHETYPE_PRECEDENCE].sort(), Object.keys(ARCHETYPE_RULES).sort());
    assert.deepEqual(ARCHETYPES, ['pivot-with-runway', 'income-pressure', 'identity-grief', 'tool-curious', 'unknown']);
  });

  test('income-pressure: money-now language', () => {
    const { archetype, matches } = detectArchetype(fields('Rent is due next month and I will take any client I can get.'));
    assert.equal(archetype, 'income-pressure');
    assert.deepEqual(matches['income-pressure'], ['rent', 'any client']);
  });

  test('identity-grief: loss language', () => {
    const { archetype } = detectArchetype(fields('AI took my job. I am angry and scared that I have to start from zero.'));
    assert.equal(archetype, 'identity-grief');
  });

  test('tool-curious: tools before a goal', () => {
    const { archetype } = detectArchetype(fields('I want to become a prompt engineer.', 'I try every new tool the week it comes out.'));
    assert.equal(archetype, 'tool-curious');
  });

  test('pivot-with-runway: savings plus a direction', () => {
    const { archetype } = detectArchetype(fields('I have six months of runway and want to move into UX writing.', 'Curious about content design.'));
    assert.equal(archetype, 'pivot-with-runway');
  });

  test('no matching phrase -> unknown, never a guess', () => {
    assert.equal(detectArchetype(fields('I write landing pages for small shops.')).archetype, 'unknown');
    assert.equal(detectArchetype(fields('')).archetype, 'unknown');
    assert.equal(detectArchetype(null).archetype, 'unknown');
  });

  test('a tie is broken by precedence (the more conservative tuning wins)', () => {
    // One income phrase, one grief phrase -> income-pressure comes first in ARCHETYPE_PRECEDENCE.
    const { archetype, matches } = detectArchetype(fields('Rent is due. I feel replaced.'));
    assert.equal(matches['income-pressure'].length, 1);
    assert.equal(matches['identity-grief'].length, 1);
    assert.equal(archetype, 'income-pressure');
  });

  test('fields.career and the lifelog never decide the archetype', () => {
    const career = 'Rent is due, I am scared, I want to be a prompt engineer, I have runway.';
    assert.equal(detectArchetype(fields('', '', career)).archetype, 'unknown');
    const model = buildPersonModel({ fields: fields('', '', career), lifelog: LIFELOG, skills: SKILLS });
    assert.equal(model.traits.archetype, 'unknown');
  });

  test('matching is anchored at the start of a word, case-insensitive', () => {
    assert.equal(detectArchetype(fields('Accurate copy matters.')).archetype, 'unknown'); // "rate" inside "accurate" does not count
    assert.equal(detectArchetype(fields('RENT is due.')).archetype, 'income-pressure');
  });
});

describe('stage of change (product facts only)', () => {
  test('no path -> contemplation; path -> preparation; path + check-in -> action', () => {
    assert.deepEqual(STAGES_OF_CHANGE, ['contemplation', 'preparation', 'action']);
    assert.equal(detectStageOfChange({}), 'contemplation');
    assert.equal(detectStageOfChange({ chosenPathId: 'messaging-consultant' }), 'preparation');
    assert.equal(detectStageOfChange({ chosenPathId: 'messaging-consultant', checkins: [] }), 'preparation');
    assert.equal(detectStageOfChange({ chosenPathId: 'messaging-consultant', checkins: [{ actionId: 'a1', kind: 'done', day: 'Thu' }] }), 'action');
    assert.equal(detectStageOfChange({ chosenPathId: 'messaging-consultant', checkins: [{ actionId: 'a2', kind: 'not_today', day: 'Thu' }] }), 'action');
  });

  test('check-ins without a chosen path stay contemplation; junk check-ins do not count', () => {
    assert.equal(detectStageOfChange({ checkins: [{ actionId: 'a1', kind: 'done', day: 'Thu' }] }), 'contemplation');
    assert.equal(detectStageOfChange({ chosenPathId: 'x', checkins: [{ kind: 'maybe' }, null] }), 'preparation');
  });

  test('buildPersonModel carries the stage through', () => {
    const base = { fields: fields('Rent is due.'), lifelog: LIFELOG, skills: SKILLS };
    assert.equal(buildPersonModel(base).traits.stageOfChange, 'contemplation');
    assert.equal(buildPersonModel({ ...base, chosenPathId: 'p1' }).traits.stageOfChange, 'preparation');
    assert.equal(buildPersonModel({ ...base, chosenPathId: 'p1', checkins: [{ actionId: 'a1', kind: 'done', day: 'Mon' }] }).traits.stageOfChange, 'action');
  });
});

describe('career capital and evidence', () => {
  test('knowHow = skills with evidence in fields or lifelog; evidence = lifelog ids that back them', () => {
    const model = buildPersonModel({ fields: fields('I ran a positioning workshop.'), lifelog: LIFELOG, skills: SKILLS });
    assert.deepEqual(model.traits.careerCapital.knowHow, ['discovery-call', 'positioning', 'workshop-facilitation']);
    assert.deepEqual(model.evidence, ['l1', 'l2', 'l3']); // l4 (kettles) backs nothing
    for (const id of model.evidence) assert.ok(LIFELOG.some((item) => item.id === id), `evidence id ${id} exists in the input`);
  });

  test('knowWhy = skills named in what pulls them (fields.pull only)', () => {
    const model = buildPersonModel({ fields: fields('A client cut my rate.', 'I enjoy the discovery call and teaching.'), lifelog: [], skills: SKILLS });
    assert.deepEqual(model.traits.careerCapital.knowWhy, ['discovery-call', 'workshop-facilitation']);
  });

  test('knowWhom = relationship labels with evidence', () => {
    const model = buildPersonModel({ fields: fields(''), lifelog: LIFELOG, skills: SKILLS });
    assert.deepEqual(model.traits.careerCapital.knowWhom, ['client', 'founder', 'peer']);
  });

  test('transfers = ranked-role transfers limited to skills with evidence', () => {
    const rankedRoles = [
      { id: 'r1', title: 'Role 1', ratio: 0.5, transfers: ['positioning', 'ghost-skill'], missing: [] },
      { id: 'r2', title: 'Role 2', ratio: 0.25, transfers: ['discovery-call'], missing: [] },
    ];
    const model = buildPersonModel({ fields: fields(''), lifelog: LIFELOG, skills: SKILLS, rankedRoles });
    assert.deepEqual(model.traits.careerCapital.transfers, ['discovery-call', 'positioning']);
  });

  test('never throws on missing or malformed input', () => {
    for (const input of [undefined, null, {}, { fields: 'text' }, { lifelog: 'nope', skills: 7 }, { lifelog: [null, 3, {}] }]) {
      const model = buildPersonModel(input);
      assert.deepEqual(model.traits.careerCapital, { knowHow: [], knowWhom: [], knowWhy: [], transfers: [], quotes: {} });
      assert.deepEqual(model.traits.constraints, NULL_CONSTRAINTS);
      assert.deepEqual(model.traits.adaptability4c, NULL_ADAPTABILITY);
      assert.equal(model.traits.archetype, 'unknown');
      assert.equal(model.traits.stageOfChange, 'contemplation');
      assert.deepEqual(model.evidence, []);
    }
  });

  test('same input -> same output; input is not mutated', () => {
    const input = {
      fields: fields('Rent is due.', 'Teaching.'), lifelog: LIFELOG, skills: SKILLS,
      constraints: { hoursPerWeek: 5, runwayMonths: 2, careDuties: true }, adaptability4c: { concern: 2, control: 3, curiosity: 4, confidence: 1 },
    };
    const snapshot = JSON.stringify(input);
    assert.deepEqual(buildPersonModel(input), buildPersonModel(input));
    assert.equal(JSON.stringify(input), snapshot);
  });
});

describe('declared constraints (validated passthrough; not measured ≠ 0)', () => {
  test('constraints default to null, never 0', () => {
    assert.deepEqual(CONSTRAINT_KEYS, ['hoursPerWeek', 'runwayMonths', 'careDuties']);
    for (const input of [{}, { constraints: undefined }, { constraints: null }, { constraints: 'ten hours' }, { constraints: [] }, { constraints: {} }]) {
      const { constraints } = buildPersonModel({ fields: fields('Rent is due.'), lifelog: LIFELOG, skills: SKILLS, ...input }).traits;
      assert.deepEqual(constraints, NULL_CONSTRAINTS);
      for (const key of CONSTRAINT_KEYS) assert.notEqual(constraints[key], 0, `${key} is null, not 0`);
    }
    assert.deepEqual(validateConstraints(undefined), NULL_CONSTRAINTS);
  });

  test('numbers >= 0 and booleans pass through unchanged, including an explicit 0 / false', () => {
    assert.deepEqual(validateConstraints({ hoursPerWeek: 8, runwayMonths: 2.5, careDuties: true }), { hoursPerWeek: 8, runwayMonths: 2.5, careDuties: true });
    assert.deepEqual(validateConstraints({ hoursPerWeek: 0, runwayMonths: 0, careDuties: false }), { hoursPerWeek: 0, runwayMonths: 0, careDuties: false });
    const model = buildPersonModel({ fields: fields(''), constraints: { hoursPerWeek: 5, runwayMonths: 4, careDuties: true } });
    assert.deepEqual(model.traits.constraints, { hoursPerWeek: 5, runwayMonths: 4, careDuties: true });
  });

  test('invalid values -> null (each key independently)', () => {
    for (const bad of [-1, NaN, Infinity, -Infinity, '5', '', true, false, null, [], {}, () => 5]) {
      assert.equal(validateConstraints({ hoursPerWeek: bad, runwayMonths: 3 }).hoursPerWeek, null, `hoursPerWeek ${String(bad)} -> null`);
      assert.equal(validateConstraints({ runwayMonths: bad, hoursPerWeek: 3 }).runwayMonths, null, `runwayMonths ${String(bad)} -> null`);
    }
    for (const bad of [1, 0, 'yes', 'true', null, [], {}]) {
      assert.equal(validateConstraints({ careDuties: bad }).careDuties, null, `careDuties ${String(bad)} -> null`);
    }
    // One bad key never spoils the others.
    assert.deepEqual(validateConstraints({ hoursPerWeek: -3, runwayMonths: 6, careDuties: 'yes' }), { hoursPerWeek: null, runwayMonths: 6, careDuties: null });
  });

  test('snake_case keys from the design doc are accepted as aliases', () => {
    assert.deepEqual(validateConstraints({ hours_per_week: 6, runway_months: 3, care_duties: true }), { hoursPerWeek: 6, runwayMonths: 3, careDuties: true });
    // camelCase wins when both are present.
    assert.equal(validateConstraints({ hoursPerWeek: 2, hours_per_week: 9 }).hoursPerWeek, 2);
  });

  test('constraints are never inferred from the text fields', () => {
    const text = fields('I have about 10 hours a week and six months of runway, and I look after my mother.', 'Runway is 4 months.');
    assert.deepEqual(buildPersonModel({ fields: text, lifelog: LIFELOG, skills: SKILLS }).traits.constraints, NULL_CONSTRAINTS);
  });
});

describe('adaptability 4C (self-report passthrough; never inferred)', () => {
  test('defaults to null for all four with the self-report label', () => {
    assert.deepEqual(ADAPTABILITY_4C, ['concern', 'control', 'curiosity', 'confidence']);
    assert.equal(ADAPTABILITY_LABEL, 'self-report');
    for (const input of [{}, { adaptability4c: null }, { adaptability4c: 'high' }, { adaptability4c: [] }, { adaptability4c: {} }]) {
      assert.deepEqual(buildPersonModel({ fields: fields(''), ...input }).traits.adaptability4c, NULL_ADAPTABILITY);
    }
    assert.deepEqual(validateAdaptability(undefined), NULL_ADAPTABILITY);
  });

  test('integers 1-5 pass through unchanged; anything else -> null per key', () => {
    assert.deepEqual(validateAdaptability({ concern: 1, control: 5, curiosity: 3, confidence: 4 }), { concern: 1, control: 5, curiosity: 3, confidence: 4, label: 'self-report' });
    for (const bad of [0, 6, -1, 3.5, '3', true, null, NaN, Infinity, [], {}]) {
      for (const key of ADAPTABILITY_4C) assert.equal(validateAdaptability({ [key]: bad })[key], null, `${key} ${String(bad)} -> null`);
    }
    assert.deepEqual(validateAdaptability({ concern: 2, control: 9, curiosity: '4', confidence: 5, extra: 3 }), { concern: 2, control: null, curiosity: null, confidence: 5, label: 'self-report' });
    const model = buildPersonModel({ fields: fields(''), adaptability4c: { concern: 2, control: 2, curiosity: 5, confidence: 1 } });
    assert.deepEqual(model.traits.adaptability4c, { concern: 2, control: 2, curiosity: 5, confidence: 1, label: 'self-report' });
    // The design doc's key is accepted as an alias.
    assert.equal(buildPersonModel({ fields: fields(''), adaptability_4c: { curiosity: 4 } }).traits.adaptability4c.curiosity, 4);
  });

  test('adaptability is passthrough, never inferred from text', () => {
    const text = fields(
      'I am very curious and confident; I feel in control and deeply concerned about my future.',
      'Curiosity 5, confidence 5, control 5, concern 5.',
      'concern: 4, control: 4, curiosity: 4, confidence: 4',
    );
    const model = buildPersonModel({ fields: text, lifelog: LIFELOG, skills: SKILLS });
    assert.deepEqual(model.traits.adaptability4c, NULL_ADAPTABILITY);
  });
});

describe('career capital quotes (verbatim phrase from the field that evidenced the skill)', () => {
  // Explicit keys (the fields() helper above takes now, pull, career in that order).
  const quoteFields = { career: 'I ran a positioning workshop last May.', now: 'I still enjoy the discovery call.', pull: 'Seven years of email flows, then more positioning work.' };

  test('every knowHow id has a key; each quote names a field and is real text (<= 80 chars) containing a keyword', () => {
    const model = buildPersonModel({ fields: quoteFields, lifelog: LIFELOG, skills: SKILLS });
    const { knowHow, quotes } = model.traits.careerCapital;
    assert.deepEqual(Object.keys(quotes), knowHow);
    assert.equal(QUOTE_MAX_CHARS, 80);
    let total = 0;
    for (const [id, list] of Object.entries(quotes)) {
      const skill = SKILLS.find((s) => s.id === id);
      for (const { field, quote } of list) {
        total += 1;
        assert.ok(['career', 'now', 'pull'].includes(field), `field name is one of the three fields (${field})`);
        assert.ok(quote.length > 0 && quote.length <= 80, `quote length ${quote.length}`);
        assert.ok(quoteFields[field].includes(quote), `"${quote}" is verbatim text of fields.${field}`);
        assert.ok(skill.keywords.some((k) => hasPhrase(quote, k)), `"${quote}" contains a keyword of ${id}`);
      }
    }
    assert.ok(total >= 3, 'quotes were found');
    assert.deepEqual(quotes['workshop-facilitation'], [{ field: 'career', quote: 'I ran a positioning workshop last May.' }]);
    assert.deepEqual(quotes['discovery-call'], [{ field: 'now', quote: 'I still enjoy the discovery call.' }]);
  });

  test('one quote per field, in field order (career, now, pull)', () => {
    const model = buildPersonModel({ fields: quoteFields, lifelog: [], skills: SKILLS });
    assert.deepEqual(model.traits.careerCapital.quotes.positioning.map((q) => q.field), ['career', 'pull']);
  });

  test('a skill evidenced only by the lifelog keeps an empty list (its ids are in evidence[])', () => {
    const model = buildPersonModel({ fields: fields(''), lifelog: LIFELOG, skills: SKILLS });
    assert.deepEqual(model.traits.careerCapital.knowHow, ['discovery-call', 'positioning']);
    assert.deepEqual(model.traits.careerCapital.quotes, { 'discovery-call': [], positioning: [] });
    for (const id of ['l1', 'l3']) assert.ok(model.evidence.includes(id), `lifelog ${id} still backs the skill`);
  });

  test('nothing is quoted when the inputs are absent', () => {
    assert.deepEqual(buildPersonModel({}).traits.careerCapital.quotes, {});
    assert.deepEqual(buildPersonModel({ fields: quoteFields }).traits.careerCapital.quotes, {}); // no dictionary -> no skills
    assert.deepEqual(skillQuotes(undefined, SKILLS, ['positioning']), { positioning: [] });
    assert.deepEqual(skillQuotes(quoteFields, SKILLS, []), {});
  });

  test('a short sentence is quoted whole; a long one is cut around the keyword at word boundaries', () => {
    const longField = `${'word '.repeat(20)}alpha beta positioning gamma delta ${'more '.repeat(20)}end.`;
    const model = buildPersonModel({ fields: fields(longField), lifelog: [], skills: SKILLS });
    const [{ field, quote }] = model.traits.careerCapital.quotes.positioning;
    assert.equal(field, 'now');
    assert.ok(quote.length <= 80 && quote.includes('positioning'), quote);
    assert.ok(longField.includes(quote), 'verbatim');
    const at = longField.indexOf(quote);
    assert.ok(at === 0 || /\s/.test(longField[at - 1]), 'starts at a word boundary');
    assert.ok(at + quote.length === longField.length || /\s/.test(longField[at + quote.length]), 'ends at a word boundary');

    // Sentence boundaries: only the sentence holding the keyword is quoted, with its full stop.
    assert.equal(excerpt('First. I ran a discovery call today. Last.', 15, 14), 'I ran a discovery call today.');
    assert.equal(excerpt('Line one\nI ran a discovery call today\nLine three', 17, 14), 'I ran a discovery call today');
    assert.equal(excerpt('', 0, 0), '');
  });

  test('matching is case-insensitive and anchored at the start of a word', () => {
    const model = buildPersonModel({ fields: fields('A WORKSHOP went well. Accurate repositioning is not positioning.'), lifelog: [], skills: SKILLS });
    const { quotes } = model.traits.careerCapital;
    assert.deepEqual(quotes['workshop-facilitation'], [{ field: 'now', quote: 'A WORKSHOP went well.' }]);
    assert.deepEqual(quotes.positioning, [{ field: 'now', quote: 'Accurate repositioning is not positioning.' }]);
  });
});

describe('synthetic persona (Sample persona — synthetic)', () => {
  test('fixture is labelled synthetic', () => {
    assert.equal(DANA._label, 'synthetic');
  });

  test('archetype follows the documented rule output for the persona text', () => {
    const { archetype, matches } = detectArchetype(DANA.fields);
    // fields.now: "start from zero" + "scared" (identity-grief x2) vs "third of the rate" (income-pressure x1).
    assert.equal(archetype, 'identity-grief');
    assert.deepEqual(matches['identity-grief'], ['start from zero', 'scared']);
    assert.deepEqual(matches['income-pressure'], ['third of the rate']);
    assert.equal(matches['tool-curious'], undefined);
  });

  test('career capital is grounded in the persona lifelog', () => {
    const model = buildPersonModel({ fields: DANA.fields, lifelog: DANA.lifelog, skills: DANA.skills });
    const { knowHow, knowWhom, knowWhy } = model.traits.careerCapital;
    for (const id of ['discovery-call', 'positioning', 'workshop-facilitation', 'copy-editing']) assert.ok(knowHow.includes(id), `knowHow has ${id}`);
    assert.deepEqual(knowWhy, ['discovery-call', 'workshop-facilitation']);
    for (const label of ['client', 'former-client', 'founder', 'peer', 'workshop-attendee', 'referral']) assert.ok(knowWhom.includes(label), `knowWhom has ${label}`);
    assert.ok(model.evidence.length >= 10, 'most lifelog items back a trait');
    const ids = new Set(DANA.lifelog.map((item) => item.id));
    for (const id of model.evidence) assert.ok(ids.has(id));
    assert.equal(model.traits.stageOfChange, 'contemplation');
  });

  test('persona quotes are verbatim field text; declared inputs stay null because the persona file has none', () => {
    const model = buildPersonModel({ fields: DANA.fields, lifelog: DANA.lifelog, skills: DANA.skills });
    const { knowHow, quotes } = model.traits.careerCapital;
    assert.deepEqual(Object.keys(quotes), knowHow);
    for (const [id, list] of Object.entries(quotes)) {
      const skill = DANA.skills.find((s) => s.id === id);
      for (const { field, quote } of list) {
        assert.ok(quote.length <= QUOTE_MAX_CHARS, `${id}: ${quote.length} chars`);
        assert.ok(DANA.fields[field].includes(quote), `${id}: "${quote}" is verbatim text of fields.${field}`);
        assert.ok(skill.keywords.some((k) => hasPhrase(quote, k)), `${id}: quote carries one of its keywords`);
      }
    }
    assert.ok(quotes['discovery-call'].some((q) => q.field === 'career' && /discovery call/i.test(q.quote)), 'discovery-call is quoted from the career field');
    // persona-dana.json declares no constraints and no 4C scores -> null, never 0, never inferred from its text.
    assert.deepEqual(model.traits.constraints, NULL_CONSTRAINTS);
    assert.deepEqual(model.traits.adaptability4c, NULL_ADAPTABILITY);
  });
});
