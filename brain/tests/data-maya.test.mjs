// Shape, story and brain checks for the synthetic 21-day Maya scenario (brain/data/maya-21d.json)
// and its Build-shape twin (brain/data/maya-21d.build.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { think } from '../index.js';

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(here, '..', 'data', 'maya-21d.json'), 'utf8');
const rawBuild = readFileSync(join(here, '..', 'data', 'maya-21d.build.json'), 'utf8');
const scenario = JSON.parse(raw);

const REQUIRED_ITEM_KEYS = ['id', 'date', 'source', 'title', 'summary'];
const SIGNALS = new Set(['career', 'noise', 'rest']);
const BLOCKERS = new Set(['time', 'energy', 'skill', 'people', 'mood']);
const WEEK_DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
const BUILD_SOURCES = new Set(['journal', 'calendar', 'sleep', 'activity', 'screen', 'checkin']);
const ARC_START = '2026-09-28';
const TODAY = '2026-10-18';

// The think() input for a past day: history sliced at that day (same replay as think.test.mjs).
function sliceAt(date) {
  return {
    fields: scenario.fields,
    path: scenario.path,
    week: structuredClone(scenario.week),
    lifelog: scenario.lifelog.filter((item) => item.date <= date),
    checkins: scenario.checkins.filter((c) => c.date <= date),
    today: date,
    arcStart: scenario.arc_start,
  };
}

test('maya-21d.json parses and is labelled synthetic', () => {
  assert.equal(scenario._label, 'synthetic');
  assert.match(scenario._note, /Sample persona — synthetic/);
  assert.match(scenario._note, /SIMULATION/);
  assert.equal(scenario.arc_start, ARC_START);
  assert.equal(scenario.today, TODAY);
  assert.equal(scenario.id, 'maya-copywriter-bakery');
});

test('persona has the dream field and no personal contact details', () => {
  const { persona } = scenario;
  assert.equal(persona.name, 'Maya R.');
  assert.equal(typeof persona.dream, 'string');
  assert.match(persona.dream, /bakery/i);
  assert.equal(persona.years, 8);
  assert.match(persona.location, /Austin/);
  assert.doesNotMatch(raw, /@[a-z0-9-]+\.[a-z]{2,}/i, 'no email addresses');
  assert.doesNotMatch(raw, /\+?\d{3}[-. ]\d{3}[-. ]\d{4}/, 'no phone numbers');
});

test('lifelog covers 21 distinct dates with 2-4 items each', () => {
  const perDay = new Map();
  for (const item of scenario.lifelog) perDay.set(item.date, (perDay.get(item.date) ?? 0) + 1);
  assert.equal(perDay.size, 21);
  const dates = [...perDay.keys()].sort();
  assert.equal(dates[0], ARC_START);
  assert.equal(dates.at(-1), TODAY);
  for (const [date, count] of perDay) assert.ok(count >= 2 && count <= 4, `${date} has ${count} items`);
});

test('every lifelog item has id/date/source/title/summary and valid brain fields', () => {
  const ids = new Set();
  for (const item of scenario.lifelog) {
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
    if ('blocker_reason' in item) assert.ok(BLOCKERS.has(item.blocker_reason), `${item.id} bad blocker_reason`);
  }
});

test('condition is self-reported on at least one item every day', () => {
  const withCondition = new Set(scenario.lifelog.filter((i) => 'condition' in i).map((i) => i.date));
  for (const date of new Set(scenario.lifelog.map((i) => i.date))) assert.ok(withCondition.has(date), `${date} has no condition`);
});

test('job-board scrolling is app_usage noise, heavy in week 1 and fading by week 3', () => {
  const scrolls = scenario.lifelog.filter((i) => i.source === 'app_usage');
  assert.ok(scrolls.length >= 6, `app_usage count ${scrolls.length}`);
  assert.ok(scrolls.every((i) => i.signal === 'noise' && i.tags.includes('app_usage')));
  const week1 = scrolls.filter((i) => i.date <= '2026-10-04');
  const week3 = scrolls.filter((i) => i.date >= '2026-10-12');
  assert.ok(week1.length >= 4, 'week 1 has daily scrolling');
  assert.ok(week3.length <= 1, 'week 3 has almost none');
  assert.ok(week1.filter((i) => /2h/.test(i.title)).length >= 3, 'about 2h/day in week 1');
  const noise = scenario.lifelog.filter((i) => i.signal === 'noise');
  assert.ok(noise.every((i) => i.source === 'app_usage' || i.source === 'sms'));
});

test('sms/messenger items are at most 3 so the default-off toggle matters', () => {
  const count = scenario.lifelog.filter((i) => i.source === 'sms' || i.source === 'messenger').length;
  assert.ok(count >= 1 && count <= 3, `sms/messenger count ${count}`);
});

test('at least 2 items are tagged interest:bakery, in every week', () => {
  const bakery = scenario.lifelog.filter((i) => i.tags.includes('interest:bakery'));
  assert.ok(bakery.length >= 2, `interest:bakery count ${bakery.length}`);
  assert.ok(bakery.some((i) => i.date <= '2026-10-04'));
  assert.ok(bakery.some((i) => i.date >= '2026-10-05' && i.date <= '2026-10-11'));
  assert.ok(bakery.some((i) => i.date >= '2026-10-12'));
});

test('role catalog: 3 roles, roles[0] is the dream path with bakery skills, others transfer expertise', () => {
  const { roles, skills } = scenario;
  assert.equal(roles.length, 3);
  const skillIds = new Set(skills.map((s) => s.id));
  for (const role of roles) {
    assert.ok(role.requires.length >= 5, `${role.id} requires too few skills`);
    for (const id of role.requires) assert.ok(skillIds.has(id), `${role.id} requires unknown skill ${id}`);
  }
  const dream = roles[0];
  assert.equal(dream.id, 'home-bakery');
  assert.equal(dream.dream, true);
  for (const id of ['recipe-costing', 'local-marketing', 'food-safety-cert']) assert.ok(dream.requires.includes(id), `dream path lacks ${id}`);
  assert.ok(roles.slice(1).every((r) => r.dream !== true));
  assert.ok(roles.slice(1).every((r) => r.requires.includes('email-copy') || r.requires.includes('customer-interview')), 'transfer paths reuse copywriting skills');
  assert.equal(scenario.path.role_id, dream.id);
  assert.equal(scenario.fallback.paths.length, 3);
  assert.deepEqual(scenario.fallback.paths.map((p) => p.role_id), roles.map((r) => r.id));
  for (const p of scenario.fallback.paths) {
    assert.equal(p.week.actions.length, 3);
    for (const a of p.week.actions) assert.ok(a.minutes > 0 && a.minutes <= 30, `${p.role_id} action over 30 min`);
  }
});

test('week has 3 todo actions on Tue/Thu/Sat for the dream path', () => {
  const { week, roles } = scenario;
  assert.equal(week.pathId, roles[0].id);
  assert.equal(week.pathTitle, roles[0].title);
  assert.equal(week.actions.length, 3);
  const expected = [['a1', 'Tue', 20], ['a2', 'Thu', 30], ['a3', 'Sat', 25]];
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

test('story arc: fear in week 1, dip on days 11-13 with blocker mood, micro comeback, strong finish', () => {
  const cond = {};
  for (const i of scenario.lifelog) if ('condition' in i) cond[i.date] = i.condition;
  for (const d of ['2026-09-29', '2026-09-30', '2026-10-01']) assert.equal(cond[d], 2, `fear day ${d}`);
  for (const d of ['2026-10-08', '2026-10-09', '2026-10-10']) assert.equal(cond[d], 2, `dip day ${d}`);
  assert.ok(cond['2026-10-11'] >= 3, 'day 14 comeback');
  assert.ok(cond['2026-10-18'] >= 4, 'day 21 strong');
  const dipBlockers = scenario.lifelog.filter((i) => i.blocker_reason && i.date >= '2026-10-08' && i.date <= '2026-10-10');
  assert.ok(dipBlockers.length >= 2 && dipBlockers.every((i) => i.blocker_reason === 'mood'));
  assert.ok(scenario.lifelog.some((i) => i.date === TODAY && /M1/.test(i.title)), 'day 21 names the M1 reality check');
});

test('checkins reference existing action ids, are chronological and follow the story', () => {
  const { week, checkins } = scenario;
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
  const week1 = checkins.filter((c) => c.date <= '2026-10-04');
  assert.equal(week1.filter((c) => c.kind === 'done').length, 2, 'week 1: 2/3 done');
  const notToday = checkins.filter((c) => c.kind === 'not_today');
  assert.deepEqual(notToday.map((c) => c.date), ['2026-09-29', '2026-10-08', '2026-10-09']);
  assert.ok(notToday.every((c) => c.blocker_reason === 'mood'));
  const comeback = checkins.find((c) => c.date === '2026-10-11');
  assert.equal(comeback.kind, 'done');
  assert.equal(comeback.variant, 'micro');
  const week3 = checkins.filter((c) => c.date >= '2026-10-12');
  assert.deepEqual(week3.map((c) => [c.actionId, c.kind]), [['a1', 'done'], ['a2', 'done'], ['a3', 'done']]);
});

test('expected block is present and internally consistent', () => {
  const { expected } = scenario;
  assert.equal(expected.day4.riskLevel, 'red');
  assert.equal(expected.day12.riskLevel, 'amber');
  assert.equal(expected.day13.riskLevel, 'amber');
  assert.equal(expected.day14.riskLevel, 'green');
  assert.equal(expected.day21.riskLevel, 'green');
  assert.equal(expected.day21.date, TODAY);
  assert.equal(expected.rootConstraint, 'motivation-automatic');
  assert.equal(expected.rankedFirst, scenario.roles[0].id);
  assert.ok(scenario.lifelog.some((i) => i.id === expected.m1.evidence && /home baker/i.test(i.title)));
});

test('think(scenario) runs without throwing and ends green with the dream path ranked first', () => {
  const report = think(scenario);
  assert.equal(report.state.risk.level, scenario.expected.day21.riskLevel);
  assert.equal(report.constraint.constraint, scenario.expected.rootConstraint);
  assert.equal(report.context.rankedRoles[0].id, scenario.expected.rankedFirst);
  assert.equal(report.goal.chosenPathId, scenario.path.role_id);
  assert.ok(['full', 'comeback'].includes(report.intervention.kind));
  assert.equal(report.intervention.message.lint.ok, true);
  assert.ok(report.person.evidence.every((id) => scenario.lifelog.some((item) => item.id === id)));
  // app_usage is never an enabled source by default: scrolling never becomes evidence.
  const used = new Set(report.person.evidence);
  for (const item of scenario.lifelog) if (item.source === 'app_usage') assert.ok(!used.has(item.id), `${item.id} leaked`);
});

test('day-level risk replay matches expected (red spike, amber dip, green comeback)', () => {
  for (const key of ['day4', 'day7', 'day12', 'day13', 'day14', 'day21']) {
    const exp = scenario.expected[key];
    const report = think(sliceAt(exp.date));
    assert.equal(report.state.risk.level, exp.riskLevel, `${key} ${exp.date} risk`);
    if (exp.reasons) assert.deepEqual(report.state.risk.reasons, exp.reasons, `${key} reasons`);
  }
  const dip = think(sliceAt(scenario.expected.day13.date));
  assert.equal(dip.state.consecRest, 2);
  assert.equal(dip.constraint.constraint, 'motivation-automatic');
});

test('M1 Fit passes only with the user’s confirm flag; evidence count is already enough', () => {
  const plain = think(scenario);
  const m1 = plain.goal.milestones.find((g) => g.id === 'M1');
  assert.equal(m1.passed, false);
  assert.deepEqual(m1.evaluation.reasons, ['not_confirmed']);
  assert.ok(m1.evaluation.done >= m1.evaluation.required);
  assert.equal(plain.goal.state, 'provisional');

  const confirmed = think({ ...scenario, confirmedGates: ['M1'] });
  assert.equal(confirmed.goal.milestones.find((g) => g.id === 'M1').passed, scenario.expected.m1.passedWhenConfirmed);
  assert.equal(confirmed.goal.state, 'validated');
});

test('Build-shape twin: LifeEvents with ts/source/kind/value/consentScope/label', () => {
  const build = JSON.parse(rawBuild);
  assert.equal(build._label, 'synthetic');
  assert.equal(build.id, scenario.id);
  assert.deepEqual(build.persona, scenario.persona);
  assert.deepEqual(build.roles, scenario.roles);
  assert.deepEqual(build.week, scenario.week);
  assert.deepEqual(build.expected, scenario.expected);
  assert.ok(Array.isArray(build.events));
  assert.equal(build.events.length, scenario.lifelog.length + scenario.checkins.length);
  let prev = '';
  for (const e of build.events) {
    assert.match(e.ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/, `${e.id} ts`);
    assert.ok(e.ts >= prev, 'events sorted by ts');
    prev = e.ts;
    assert.ok(BUILD_SOURCES.has(e.source), `${e.id} bad source ${e.source}`);
    assert.equal(typeof e.kind, 'string');
    assert.ok(typeof e.value === 'string' || typeof e.value === 'number');
    assert.ok(e.consentScope === 'local_only' || e.consentScope === 'summary_ok');
    assert.equal(e.label, 'synthetic');
    assert.ok(!('date' in e), `${e.id} must use ts, not date`);
  }
  for (const item of scenario.lifelog) {
    const e = build.events.find((x) => x.id === item.id);
    assert.ok(e, `missing event ${item.id}`);
    assert.equal(e.ts.slice(0, 10), item.date);
    assert.equal(e.kind, item.source);
  }
  assert.ok(build.events.filter((e) => e.source === 'checkin').length === scenario.checkins.length);
  assert.ok(build.events.filter((e) => e.kind === 'app_usage').every((e) => e.source === 'screen'));
  assert.ok(build.events.filter((e) => ['sms', 'messenger', 'photo'].includes(e.kind)).every((e) => e.consentScope === 'local_only'));
});

test('no forbidden words in either data file', () => {
  // Built from fragments so the forbidden vendor name never appears literally in the repo.
  const forbidden = new RegExp(['gem', 'ini'].join('') + '|' + ['제미', '나이'].join(''), 'i');
  assert.doesNotMatch(raw, forbidden);
  assert.doesNotMatch(rawBuild, forbidden);
});
