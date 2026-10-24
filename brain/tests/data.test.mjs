// Shape and story checks for the synthetic 14-day demo scenario (brain/data/dana-14d.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(here, '..', 'data', 'dana-14d.json'), 'utf8');

const REQUIRED_ITEM_KEYS = ['id', 'date', 'source', 'title', 'summary'];
const SIGNALS = new Set(['career', 'noise', 'rest']);
const BLOCKERS = new Set(['time', 'energy', 'skill', 'people', 'mood']);
const WEEK_DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

test('dana-14d.json parses and is labelled synthetic', () => {
  const data = JSON.parse(raw);
  assert.equal(data._label, 'synthetic');
  assert.match(data._note, /Sample persona — synthetic/);
  assert.equal(data.arc_start, '2026-10-05');
  assert.equal(data.today, '2026-10-18');
  assert.equal(data.id, 'dana-copywriter');
});

test('lifelog covers 14 distinct dates with 2-4 items each', () => {
  const { lifelog } = JSON.parse(raw);
  const perDay = new Map();
  for (const item of lifelog) perDay.set(item.date, (perDay.get(item.date) ?? 0) + 1);
  assert.equal(perDay.size, 14);
  const dates = [...perDay.keys()].sort();
  assert.equal(dates[0], '2026-10-05');
  assert.equal(dates.at(-1), '2026-10-18');
  for (const [date, count] of perDay) {
    assert.ok(count >= 2 && count <= 4, `${date} has ${count} items`);
  }
});

test('every lifelog item has id/date/source/title/summary and valid brain fields', () => {
  const { lifelog } = JSON.parse(raw);
  const ids = new Set();
  for (const item of lifelog) {
    for (const key of REQUIRED_ITEM_KEYS) {
      assert.equal(typeof item[key], 'string', `${item.id ?? '?'} missing ${key}`);
      assert.ok(item[key].length > 0, `${item.id} empty ${key}`);
    }
    assert.ok(!ids.has(item.id), `duplicate id ${item.id}`);
    ids.add(item.id);
    assert.ok(Array.isArray(item.tags), `${item.id} tags must be an array`);
    assert.ok('url' in item, `${item.id} missing url`);
    assert.ok(SIGNALS.has(item.signal), `${item.id} bad signal ${item.signal}`);
    if ('condition' in item) {
      assert.ok(Number.isInteger(item.condition) && item.condition >= 1 && item.condition <= 5, `${item.id} bad condition`);
    }
    if ('blocker_reason' in item) {
      assert.ok(BLOCKERS.has(item.blocker_reason), `${item.id} bad blocker_reason`);
    }
  }
});

test('sms/messenger items are at most 3 so the default-off toggle matters', () => {
  const { lifelog } = JSON.parse(raw);
  const count = lifelog.filter((i) => i.source === 'sms' || i.source === 'messenger').length;
  assert.ok(count >= 1 && count <= 3, `sms/messenger count ${count}`);
});

test('exactly 2 noise items exist', () => {
  const { lifelog } = JSON.parse(raw);
  assert.equal(lifelog.filter((i) => i.signal === 'noise').length, 2);
});

test('condition is self-reported on at least one item every day', () => {
  const { lifelog } = JSON.parse(raw);
  const withCondition = new Set(lifelog.filter((i) => 'condition' in i).map((i) => i.date));
  const allDates = new Set(lifelog.map((i) => i.date));
  for (const date of allDates) assert.ok(withCondition.has(date), `${date} has no condition`);
});

test('story arc: steady, dip on days 9-11, recovery, strong finish', () => {
  const { lifelog } = JSON.parse(raw);
  const cond = {};
  for (const i of lifelog) if ('condition' in i) cond[i.date] = i.condition;
  for (const d of ['2026-10-13', '2026-10-14', '2026-10-15']) assert.equal(cond[d], 2, `dip day ${d}`);
  assert.ok(cond['2026-10-16'] >= 3, 'day 12 recovery');
  assert.ok(cond['2026-10-18'] >= 4, 'day 14 strong');
  const blockers = lifelog.filter((i) => i.blocker_reason).map((i) => i.blocker_reason);
  assert.ok(blockers.includes('energy') && blockers.includes('time'));
});

test('week has 3 todo actions on Tue/Thu/Sat for roles[0]', () => {
  const { week, roles } = JSON.parse(raw);
  assert.equal(week.pathId, roles[0].id);
  assert.equal(week.pathTitle, roles[0].title);
  assert.equal(week.actions.length, 3);
  const expected = [['a1', 'Tue', 25], ['a2', 'Thu', 30], ['a3', 'Sat', 20]];
  week.actions.forEach((a, idx) => {
    assert.equal(a.id, expected[idx][0]);
    assert.equal(a.day, expected[idx][1]);
    assert.equal(a.minutes, expected[idx][2]);
    assert.equal(a.status, 'todo');
    assert.equal(a.moves, 0);
    assert.equal(typeof a.short, 'string');
  });
  assert.equal(week.summary, '0/3 done');
});

test('checkins reference existing action ids and follow the story', () => {
  const { week, checkins } = JSON.parse(raw);
  const actionIds = new Set(week.actions.map((a) => a.id));
  let prev = '';
  for (const c of checkins) {
    assert.ok(actionIds.has(c.actionId), `unknown action ${c.actionId}`);
    assert.ok(c.kind === 'done' || c.kind === 'not_today', `bad kind ${c.kind}`);
    assert.ok(WEEK_DAYS.has(c.day), `bad day ${c.day}`);
    assert.ok(c.date >= prev, 'checkins must be chronological');
    prev = c.date;
    if (c.kind === 'not_today') assert.ok(BLOCKERS.has(c.blocker_reason), 'not_today needs blocker_reason');
  }
  const week1 = checkins.filter((c) => c.date <= '2026-10-11');
  assert.equal(week1.length, 3);
  assert.ok(week1.every((c) => c.kind === 'done'));
  const notToday = checkins.filter((c) => c.kind === 'not_today');
  assert.equal(notToday.length, 2);
  assert.deepEqual(notToday.map((c) => c.date), ['2026-10-13', '2026-10-14']);
  assert.ok(checkins.some((c) => c.kind === 'done' && c.date === '2026-10-16'));
  assert.ok(checkins.some((c) => c.kind === 'done' && c.date === '2026-10-17'));
  assert.ok(checkins.some((c) => c.kind === 'done' && c.date === '2026-10-18'));
});

test('expected block is present and internally consistent', () => {
  const { expected } = JSON.parse(raw);
  assert.equal(expected.day11.riskLevel, 'amber');
  assert.equal(expected.day14.riskLevel, 'green');
  assert.ok(['opportunity-time', 'motivation-automatic'].includes(expected.rootConstraint));
});

test('identity is copied from app/data/persona-dana.json', () => {
  const data = JSON.parse(raw);
  const persona = JSON.parse(readFileSync(join(here, '..', '..', 'app', 'data', 'persona-dana.json'), 'utf8'));
  assert.equal(data.id, persona.id);
  assert.deepEqual(data.persona, persona.persona);
  assert.deepEqual(data.fields, persona.fields);
  assert.deepEqual(data.skills, persona.skills);
  assert.deepEqual(data.roles, persona.roles);
  assert.deepEqual(data.fallback, persona.fallback);
});

test('no forbidden words in the data file', () => {
  // Built from fragments so the forbidden vendor name never appears literally in the repo.
  const forbidden = new RegExp(['gem', 'ini'].join('') + '|' + ['제미', '나이'].join(''), 'i');
  assert.doesNotMatch(raw, forbidden);
});
