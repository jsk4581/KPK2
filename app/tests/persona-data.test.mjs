// persona-data.test.mjs: shape and safety checks for the synthetic Dana persona
// (app/data/persona-dana.json and app/data/persona/dana.svg). Data only; judgment
// functions are tested in their own file.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));
const JSON_PATH = join(DATA_DIR, 'persona-dana.json');
const RAW = existsSync(JSON_PATH) ? readFileSync(JSON_PATH, 'utf8') : '';
const P = RAW ? JSON.parse(RAW) : {};

const SOURCES = ['note', 'saved_link', 'calendar', 'sms', 'messenger', 'document', 'photo'];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SALES_ROLES = ['messaging-consultant', 'brand-voice-systems', 'copy-educator'];
const EM_DASH = String.fromCharCode(0x2014);

const unique = (arr) => new Set(arr).size === arr.length;

describe('persona-dana.json: file and label', () => {
  test('file exists and parses', () => {
    assert.ok(RAW.length > 0, 'app/data/persona-dana.json is missing');
  });

  test('labelled synthetic', () => {
    assert.equal(P._label, 'synthetic');
  });

  test('persona block matches the spec', () => {
    assert.equal(P.id, 'dana-copywriter');
    assert.ok(WEEK_DAYS.includes(P.today), `today must be a weekday name, got ${P.today}`);
    const p = P.persona;
    assert.equal(p.name, 'Dana');
    assert.equal(p.headline, 'My clients use ChatGPT now.');
    assert.equal(typeof p.role, 'string');
    assert.equal(typeof p.years, 'number');
    assert.equal(typeof p.location, 'string');
    assert.equal(p.photo, 'persona/dana.svg');
  });

  test('three input fields are non-empty strings', () => {
    for (const key of ['career', 'now', 'pull']) {
      assert.equal(typeof P.fields?.[key], 'string', `fields.${key}`);
      assert.ok(P.fields[key].trim().length > 20, `fields.${key} has real content`);
    }
  });
});

describe('persona-dana.json: skills and roles', () => {
  const skillIds = (P.skills ?? []).map((s) => s.id);

  test('10 to 14 skills with unique ids, a name and lowercase keywords', () => {
    assert.ok(skillIds.length >= 10 && skillIds.length <= 14, `skills: ${skillIds.length}`);
    assert.ok(unique(skillIds), 'skill ids are unique');
    for (const s of P.skills) {
      assert.equal(typeof s.name, 'string');
      assert.ok(Array.isArray(s.keywords) && s.keywords.length > 0, `${s.id} has keywords`);
      for (const k of s.keywords) assert.equal(k, k.toLowerCase(), `${s.id} keyword "${k}" is lowercase`);
    }
  });

  test('6 to 8 roles with unique ids, the three Sales draft paths first', () => {
    const roleIds = (P.roles ?? []).map((r) => r.id);
    assert.ok(roleIds.length >= 6 && roleIds.length <= 8, `roles: ${roleIds.length}`);
    assert.ok(unique(roleIds), 'role ids are unique');
    assert.deepEqual(roleIds.slice(0, 3), SALES_ROLES);
  });

  test('every role requires only known skill ids, without duplicates', () => {
    for (const r of P.roles) {
      assert.equal(typeof r.title, 'string');
      assert.ok(r.requires.length > 0, `${r.id} requires something`);
      assert.ok(unique(r.requires), `${r.id} requires has no duplicates`);
      for (const id of r.requires) assert.ok(skillIds.includes(id), `${r.id} requires unknown skill ${id}`);
    }
  });
});

describe('persona-dana.json: lifelog', () => {
  const items = P.lifelog ?? [];
  const skillIds = (P.skills ?? []).map((s) => s.id);

  test('12 to 20 items with unique ids', () => {
    assert.ok(items.length >= 12 && items.length <= 20, `lifelog: ${items.length}`);
    assert.ok(unique(items.map((i) => i.id)), 'lifelog ids are unique');
  });

  test('sources are known and include sms and messenger', () => {
    for (const i of items) assert.ok(SOURCES.includes(i.source), `${i.id} source ${i.source}`);
    const used = new Set(items.map((i) => i.source));
    for (const s of ['note', 'saved_link', 'calendar', 'sms', 'messenger']) assert.ok(used.has(s), `uses ${s}`);
  });

  test('dates span at most 14 days', () => {
    const times = items.map((i) => Date.parse(`${i.date}T00:00:00Z`));
    for (const t of times) assert.ok(Number.isFinite(t), 'valid ISO date');
    const spanDays = (Math.max(...times) - Math.min(...times)) / 86400000;
    assert.ok(spanDays <= 13, `span ${spanDays} days`);
  });

  test('items have title, summary, skill-id tags and a url only on saved links', () => {
    for (const i of items) {
      assert.ok(i.title && i.summary, `${i.id} has title and summary`);
      assert.ok(Array.isArray(i.tags), `${i.id} tags is an array`);
      for (const t of i.tags) assert.ok(skillIds.includes(t), `${i.id} tag ${t} is a skill id`);
      if (i.source === 'saved_link') assert.match(i.url, /^https:\/\/example\.com\//, `${i.id} url`);
      else assert.equal(i.url, null, `${i.id} url is null`);
    }
  });
});

describe('persona-dana.json: fallback paths', () => {
  const paths = P.fallback?.paths ?? [];

  test('one fallback path per role, no extras', () => {
    const roleIds = (P.roles ?? []).map((r) => r.id).sort();
    assert.ok(roleIds.length > 0);
    assert.deepEqual(paths.map((p) => p.role_id).sort(), roleIds);
  });

  test('each path has a one-liner, two first-two-weeks steps and a 12-week arc', () => {
    for (const p of paths) {
      assert.ok(p.one_liner, `${p.role_id} one_liner`);
      assert.equal(p.first_two_weeks.length, 2, `${p.role_id} first_two_weeks`);
      assert.ok(p.arc_12w, `${p.role_id} arc_12w`);
    }
  });

  test('three actions per week, 30 minutes or less, a weekday and a 10-minute short version', () => {
    for (const p of paths) {
      const actions = p.week.actions;
      assert.equal(actions.length, 3, `${p.role_id} has 3 actions`);
      for (const a of actions) {
        assert.ok(a.title, `${p.role_id} action title`);
        assert.ok(Number.isInteger(a.minutes) && a.minutes > 0 && a.minutes <= 30, `${p.role_id} minutes ${a.minutes}`);
        assert.ok(WEEK_DAYS.includes(a.day), `${p.role_id} day ${a.day}`);
        assert.ok(a.short && a.short !== a.title, `${p.role_id} short version`);
      }
    }
  });
});

describe('persona data: safety', () => {
  const SVG_PATH = join(DATA_DIR, 'persona', 'dana.svg');
  const SVG = existsSync(SVG_PATH) ? readFileSync(SVG_PATH, 'utf8') : '';
  const texts = [RAW, SVG];

  test('no email-shaped text', () => {
    for (const t of texts) assert.doesNotMatch(t, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  });

  test('no phone-shaped text (Korean or North American)', () => {
    for (const t of texts) {
      assert.doesNotMatch(t, /(?<!\d)01[016789][-. ]?\d{3,4}[-. ]?\d{4}(?!\d)/);
      assert.doesNotMatch(t, /(?<![\d-])\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}(?!\d)/);
      assert.doesNotMatch(t, /\+\d{1,3}[-. ]?\d/);
    }
  });

  test('no secret-shaped text and no em dash', () => {
    const SECRET = new RegExp(['sk-' + 'ant-', 'AI' + 'za', 'gh' + 'p_', '-----' + 'BEGIN'].join('|'));
    for (const t of texts) {
      assert.doesNotMatch(t, SECRET);
      assert.ok(!t.includes(EM_DASH), 'no em dash');
    }
  });

  test('dana.svg exists, is one colour and says SIMULATION', () => {
    assert.ok(SVG.startsWith('<svg'), 'svg file present');
    assert.match(SVG, /SIMULATION/);
    assert.doesNotMatch(SVG, /<image|href=/, 'no embedded or linked image');
    const colours = new Set((SVG.match(/#[0-9a-fA-F]{3,6}\b/g) ?? []).map((c) => c.toLowerCase()));
    assert.ok(colours.size <= 1, `one colour, got ${[...colours].join(', ')}`);
  });
});
