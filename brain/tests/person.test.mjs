// person.test.mjs — person model: archetype keyword rules, stage of change, career capital, evidence.
// Run from brain/: node --test tests/   All fixtures are inline and synthetic ("Sample persona — synthetic").

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Module object, not named bindings: a missing export must fail one test, not the whole file.
import * as person from '../person.js';

const { buildPersonModel, detectArchetype, detectStageOfChange, ARCHETYPES, ARCHETYPE_RULES, ARCHETYPE_PRECEDENCE, STAGES_OF_CHANGE } = person;

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
      assert.deepEqual(model.traits.careerCapital, { knowHow: [], knowWhom: [], knowWhy: [], transfers: [] });
      assert.equal(model.traits.archetype, 'unknown');
      assert.equal(model.traits.stageOfChange, 'contemplation');
      assert.deepEqual(model.evidence, []);
    }
  });

  test('same input -> same output; input is not mutated', () => {
    const input = { fields: fields('Rent is due.', 'Teaching.'), lifelog: LIFELOG, skills: SKILLS };
    const snapshot = JSON.stringify(input);
    assert.deepEqual(buildPersonModel(input), buildPersonModel(input));
    assert.equal(JSON.stringify(input), snapshot);
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
});
