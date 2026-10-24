// career-logic.test.mjs: judgment functions of the career demo (app/logic.js).
// Run from the repo root: node --test app/tests
// Fixtures are inline and small on purpose: these tests do not depend on app/data/persona-dana.json.
// Every value here is synthetic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Module object import: a missing export fails one test, not the whole file (TDD red).
import * as logic from '../logic.js';

// ---------- inline fixtures (synthetic) ----------

const SKILLS = [
  { id: 'discovery-call', name: 'Discovery interviews', keywords: ['discovery call', 'interview'] },
  { id: 'positioning', name: 'Positioning', keywords: ['positioning', 'message map'] },
  { id: 'brand-voice', name: 'Brand voice', keywords: ['brand voice', 'tone of voice'] },
  { id: 'teaching', name: 'Teaching', keywords: ['workshop', 'teaching'] },
  { id: 'prompting', name: 'Prompt writing', keywords: ['prompt'] },
  { id: 'pricing', name: 'Project pricing', keywords: ['pricing', 'rate card'] },
];

const ROLES = [
  { id: 'r-a', title: 'Role A', requires: ['discovery-call', 'positioning', 'pricing'] },
  { id: 'r-b', title: 'Role B', requires: ['brand-voice', 'prompting'] },
  { id: 'r-c', title: 'Role C', requires: ['teaching', 'pricing', 'positioning'] },
  { id: 'r-d', title: 'Role D', requires: ['discovery-call', 'brand-voice'] },
  { id: 'r-e', title: 'Role E', requires: ['prompting'] },
];

const LIFELOG = [
  { id: 'l1', date: '2026-10-12', source: 'calendar', title: 'Client discovery call', summary: 'Ran a discovery call for a launch.', tags: ['discovery-call'], url: null },
  { id: 'l2', date: '2026-10-13', source: 'note', title: 'Rate cut', summary: 'A client asked for polish only at a lower rate.', tags: ['pricing'], url: null },
  { id: 'l3', date: '2026-10-14', source: 'saved_link', title: 'Article on prompt libraries', summary: 'Saved a piece on how teams write prompts.', tags: ['prompting'], url: null },
  { id: 'l4', date: '2026-10-15', source: 'sms', title: 'Friend asks about workshop', summary: 'Someone asked when the next workshop runs.', tags: ['teaching'], url: null },
  { id: 'l5', date: '2026-10-16', source: 'messenger', title: 'Group chat on rates', summary: 'Peers compared project rates.', tags: ['pricing'], url: null },
  { id: 'l6', date: '2026-10-17', source: 'document', title: 'Old brand voice guide', summary: 'Found the brand voice guide from a past project.', tags: ['brand-voice'], url: null },
];

const DEFAULT_SOURCES = ['note', 'saved_link', 'calendar'];

const DRAFT = {
  role_id: 'r-a',
  title: 'Role A',
  one_liner: 'Sell the message, not the word count.',
  first_two_weeks: ['Offer a paid pilot session', 'Repackage two past projects'],
  week: {
    actions: [
      { title: 'Write a before/after page', minutes: 25, day: 'Tue', short: 'Write only the headline of the page' },
      { title: 'Draft a pilot offer email', minutes: 30, day: 'Thu', short: 'Write only the subject line' },
      { title: 'List seven discovery questions', minutes: 20, day: 'Sat', short: 'Write two questions' },
    ],
  },
  arc_12w: 'Writing hours to session income',
};

function weekFrom(specs, today = 'Thu') {
  // specs: [[day, status, moves?], ...]
  const week = logic.buildWeek(
    { role_id: 'r-x', title: 'Role X', week: { actions: specs.map(([day], i) => ({ title: `Action ${i + 1}`, minutes: 20, day, short: `Short ${i + 1}` })) } },
    today,
  );
  // A draft never carries NextWeek (buildWeek maps unknown days to today), so set day after building.
  specs.forEach(([day, status, moves], i) => {
    week.actions[i].day = day;
    week.actions[i].status = status || 'todo';
    week.actions[i].moves = moves || 0;
  });
  return week;
}

const dayOf = (week, id) => week.actions.find((a) => a.id === id).day;

// ---------- constants ----------

describe('career logic: constants', () => {
  test('day and status sets', () => {
    assert.deepEqual(logic.WEEK_DAYS, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    assert.equal(logic.NEXT_WEEK, 'NextWeek');
    assert.deepEqual(logic.ACTION_STATUSES, ['todo', 'done', 'moved']);
  });
});

// ---------- summarizeLifelog / mergePrefill ----------

describe('career logic: summarizeLifelog', () => {
  test('returns three strings built only from enabled sources', () => {
    const out = logic.summarizeLifelog(LIFELOG, DEFAULT_SOURCES);
    assert.deepEqual(Object.keys(out).sort(), ['career', 'now', 'pull']);
    for (const key of ['career', 'now', 'pull']) assert.equal(typeof out[key], 'string');
    assert.match(out.career, /discovery call/i);
    assert.match(out.now, /lower rate/i);
    assert.match(out.pull, /prompts/i);
    const all = `${out.career} ${out.now} ${out.pull}`;
    assert.doesNotMatch(all, /next workshop/i, 'sms is off by default');
    assert.doesNotMatch(all, /project rates/i, 'messenger is off by default');
  });

  test('turning a source on changes the summary; same input gives the same output', () => {
    const before = logic.summarizeLifelog(LIFELOG, DEFAULT_SOURCES);
    const after = logic.summarizeLifelog(LIFELOG, [...DEFAULT_SOURCES, 'sms']);
    assert.notEqual(after.now, before.now);
    assert.match(after.now, /next workshop/i);
    assert.deepEqual(logic.summarizeLifelog(LIFELOG, [...DEFAULT_SOURCES, 'sms']), after);
  });

  test('no enabled sources or no items gives empty strings, never throws', () => {
    assert.deepEqual(logic.summarizeLifelog(LIFELOG, []), { career: '', now: '', pull: '' });
    assert.deepEqual(logic.summarizeLifelog(null, null), { career: '', now: '', pull: '' });
  });

  test('an explicit field hint on an item wins over the source mapping', () => {
    const items = [{ id: 'h1', date: '2026-10-12', source: 'note', title: 'Hint', summary: 'Loves teaching groups.', tags: [], field: 'pull' }];
    const out = logic.summarizeLifelog(items, ['note']);
    assert.match(out.pull, /teaching groups/);
    assert.equal(out.now, '');
  });
});

describe('career logic: mergePrefill (toggle change keeps edited fields)', () => {
  test('fields the user edited are kept when the toggles change', () => {
    const current = { career: 'My own words about my career.', now: 'old now', pull: 'old pull' };
    const fresh = logic.summarizeLifelog(LIFELOG, [...DEFAULT_SOURCES, 'sms', 'messenger']);
    const merged = logic.mergePrefill(current, fresh, ['career']);
    assert.equal(merged.career, 'My own words about my career.');
    assert.equal(merged.now, fresh.now);
    assert.equal(merged.pull, fresh.pull);
  });

  test('accepts a Set of edited keys and does not mutate its inputs', () => {
    const current = { career: 'c', now: 'n', pull: 'p' };
    const fresh = { career: 'C2', now: 'N2', pull: 'P2' };
    const merged = logic.mergePrefill(current, fresh, new Set(['now', 'pull']));
    assert.deepEqual(merged, { career: 'C2', now: 'n', pull: 'p' });
    assert.deepEqual(current, { career: 'c', now: 'n', pull: 'p' });
  });
});

// ---------- extractSkills / skillOverlap / rankRoles ----------

describe('career logic: extractSkills', () => {
  test('keywords in fields or enabled items, plus item tags; sorted and unique', () => {
    const fields = { career: 'I run a Discovery Call and write a message map.', now: '', pull: 'I like teaching.' };
    const items = [LIFELOG[2]]; // tagged prompting, mentions prompts
    assert.deepEqual(logic.extractSkills(fields, items, SKILLS), ['discovery-call', 'positioning', 'prompting', 'teaching']);
  });

  test('keywords match at word starts only (no match inside another word)', () => {
    const skills = [{ id: 'ai', name: 'AI tools', keywords: ['ai'] }];
    assert.deepEqual(logic.extractSkills({ career: 'I maintain sites', now: '', pull: '' }, [], skills), []);
    assert.deepEqual(logic.extractSkills({ career: 'I use AI daily', now: '', pull: '' }, [], skills), ['ai']);
  });

  test('empty inputs give an empty array', () => {
    assert.deepEqual(logic.extractSkills({ career: '', now: '', pull: '' }, [], SKILLS), []);
    assert.deepEqual(logic.extractSkills(null, null, null), []);
  });
});

describe('career logic: skillOverlap', () => {
  test('ratio = |user and required| / |required|, transfers and missing in role order', () => {
    const r = logic.skillOverlap(['pricing', 'discovery-call', 'teaching'], ROLES[0]);
    assert.deepEqual(r, { ratio: 0.67, transfers: ['discovery-call', 'pricing'], missing: ['positioning'] });
  });

  test('rounds to two decimals', () => {
    const role = { id: 'x', title: 'X', requires: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] };
    assert.equal(logic.skillOverlap(['a'], role).ratio, 0.13); // 0.125
    assert.equal(logic.skillOverlap(['a', 'b', 'c', 'd', 'e'], role).ratio, 0.63); // 0.625
    assert.equal(logic.skillOverlap(['a'], { id: 'y', title: 'Y', requires: ['a', 'b', 'c'] }).ratio, 0.33);
    assert.equal(logic.skillOverlap(['a', 'b', 'c'], { id: 'y', title: 'Y', requires: ['a', 'b', 'c'] }).ratio, 1);
  });

  test('a role with no required skills has ratio 0', () => {
    assert.deepEqual(logic.skillOverlap(['a'], { id: 'z', title: 'Z', requires: [] }), { ratio: 0, transfers: [], missing: [] });
  });
});

describe('career logic: rankRoles', () => {
  test('top three by ratio, ties keep catalog order', () => {
    // user: discovery-call, brand-voice, prompting
    // A 1/3=0.33, B 2/2=1, C 0, D 2/2=1, E 1/1=1 -> B, D, E (all 1, catalog order)
    const ranked = logic.rankRoles(['discovery-call', 'brand-voice', 'prompting'], ROLES);
    assert.deepEqual(ranked.map((r) => r.id), ['r-b', 'r-d', 'r-e']);
    assert.deepEqual(ranked[0], { id: 'r-b', title: 'Role B', ratio: 1, transfers: ['brand-voice', 'prompting'], missing: [] });
  });

  test('all tied at zero keeps the first three in catalog order', () => {
    assert.deepEqual(logic.rankRoles([], ROLES).map((r) => r.id), ['r-a', 'r-b', 'r-c']);
  });

  test('fewer than three roles returns what exists', () => {
    assert.equal(logic.rankRoles(['pricing'], ROLES.slice(0, 2)).length, 2);
    assert.deepEqual(logic.rankRoles(['pricing'], null), []);
  });
});

// ---------- buildWeek ----------

describe('career logic: buildWeek', () => {
  test('three todo actions with ids, minutes capped at 30, summary 0/3 done', () => {
    const draft = { ...DRAFT, week: { actions: [...DRAFT.week.actions.slice(0, 2), { ...DRAFT.week.actions[2], minutes: 45 }, { title: 'extra', minutes: 5, day: 'Mon', short: 's' }] } };
    const week = logic.buildWeek(draft, 'Thu');
    assert.equal(week.actions.length, 3);
    assert.deepEqual(week.actions.map((a) => a.id), ['a1', 'a2', 'a3']);
    assert.deepEqual(week.actions.map((a) => a.status), ['todo', 'todo', 'todo']);
    assert.deepEqual(week.actions.map((a) => a.moves), [0, 0, 0]);
    assert.deepEqual(week.actions.map((a) => a.day), ['Tue', 'Thu', 'Sat']);
    assert.equal(week.actions[2].minutes, 30);
    assert.equal(week.actions[1].short, 'Write only the subject line');
    assert.equal(week.summary, '0/3 done');
    assert.equal(week.pathId, 'r-a');
    assert.equal(week.pathTitle, 'Role A');
    assert.equal(week.pendingComeback, false);
  });

  test('does not mutate the draft', () => {
    const copy = JSON.parse(JSON.stringify(DRAFT));
    logic.buildWeek(DRAFT, 'Thu');
    assert.deepEqual(DRAFT, copy);
  });
});

// ---------- applyCheckin: Not today ----------

describe('career logic: applyCheckin not_today moves, never deletes', () => {
  test('an action earlier than today moves to the day after today', () => {
    const week = weekFrom([['Tue'], ['Fri'], ['Sat']]);
    const r = logic.applyCheckin(week, 'a1', 'not_today', 'Thu');
    assert.equal(r.ok, true);
    assert.equal(dayOf(r.week, 'a1'), 'Fri');
    assert.equal(r.week.actions.length, 3);
    assert.equal(r.adjustment.toDay, 'Fri');
    assert.equal(r.adjustment.fromDay, 'Tue');
  });

  test('an action later than today moves to the day after the action', () => {
    const week = weekFrom([['Tue'], ['Fri'], ['Sun']]);
    const r = logic.applyCheckin(week, 'a2', 'not_today', 'Thu');
    assert.equal(dayOf(r.week, 'a2'), 'Sat');
  });

  test('the last action of the week moves to NextWeek; NextWeek actions are left out of "last"', () => {
    // a3 is already NextWeek; among the rest a2 (Fri) is the latest.
    const week = weekFrom([['Tue'], ['Fri'], ['NextWeek', 'moved', 1]]);
    const r = logic.applyCheckin(week, 'a2', 'not_today', 'Thu');
    assert.equal(dayOf(r.week, 'a2'), 'NextWeek');
    assert.equal(r.adjustment.toDay, 'NextWeek');
    assert.match(r.message, /Moved to next week/);
  });

  test('done actions are left out of "last" too', () => {
    const week = weekFrom([['Tue'], ['Wed'], ['Sat', 'done']]);
    const r = logic.applyCheckin(week, 'a2', 'not_today', 'Mon');
    assert.equal(dayOf(r.week, 'a2'), 'NextWeek');
  });

  test('several actions sharing the latest day are all "last"', () => {
    const week = weekFrom([['Mon'], ['Fri'], ['Fri']]);
    const r1 = logic.applyCheckin(week, 'a2', 'not_today', 'Tue');
    assert.equal(dayOf(r1.week, 'a2'), 'NextWeek');
    const r2 = logic.applyCheckin(week, 'a3', 'not_today', 'Tue');
    assert.equal(dayOf(r2.week, 'a3'), 'NextWeek');
  });

  test('moving past Sunday goes to NextWeek', () => {
    // a1 is not the last action (a2 is Fri), but today is Sun: the day after Sun is next week.
    const week = weekFrom([['Tue'], ['Fri'], ['Wed']], 'Sun');
    const r = logic.applyCheckin(week, 'a1', 'not_today', 'Sun');
    assert.equal(dayOf(r.week, 'a1'), 'NextWeek');
  });

  test('a day that already has another action keeps both', () => {
    const week = weekFrom([['Tue'], ['Fri'], ['Sat']]);
    const r = logic.applyCheckin(week, 'a1', 'not_today', 'Thu');
    assert.equal(dayOf(r.week, 'a1'), 'Fri');
    assert.equal(dayOf(r.week, 'a2'), 'Fri');
    assert.equal(r.week.actions.length, 3);
  });

  test('status becomes moved and moves goes up on every repeat', () => {
    const week = weekFrom([['Mon'], ['Wed'], ['Sat']]);
    const r1 = logic.applyCheckin(week, 'a1', 'not_today', 'Mon');
    const a1 = r1.week.actions.find((a) => a.id === 'a1');
    assert.equal(a1.status, 'moved');
    assert.equal(a1.moves, 1);
    assert.equal(a1.day, 'Tue');
    const r2 = logic.applyCheckin(r1.week, 'a1', 'not_today', 'Tue');
    const again = r2.week.actions.find((a) => a.id === 'a1');
    assert.equal(again.moves, 2);
    assert.equal(again.day, 'Wed');
    assert.equal(r2.adjustment.moves, 2);
  });

  test('response lines: rest day first, then reframe, 10-minute option, Moved to <day>', () => {
    const week = weekFrom([['Tue'], ['Thu'], ['Sat']]);
    const r = logic.applyCheckin(week, 'a2', 'not_today', 'Thu');
    const lines = r.message.split('\n');
    assert.equal(lines[0], 'Today was a rest day, not a missed day.');
    assert.equal(lines.length, 4);
    assert.match(lines[2], /10 minutes/);
    assert.match(lines[2], /Short 2/);
    assert.equal(lines[3], 'Moved to Fri');
    assert.equal(r.adjustment.tenMinute, lines[2]);
    assert.equal(r.shareCard, null);
    assert.equal(r.comeback, null);
  });

  test('no scolding words in any response', () => {
    const week = weekFrom([['Tue'], ['Thu'], ['Sat']]);
    const r = logic.applyCheckin(week, 'a2', 'not_today', 'Thu');
    assert.doesNotMatch(r.message.replace('not a missed day', ''), /fail|missed|behind|lazy/i);
  });

  test('does not mutate the input week', () => {
    const week = weekFrom([['Tue'], ['Thu'], ['Sat']]);
    const copy = JSON.parse(JSON.stringify(week));
    logic.applyCheckin(week, 'a1', 'not_today', 'Thu');
    logic.applyCheckin(week, 'a1', 'done', 'Thu');
    assert.deepEqual(week, copy);
  });
});

// ---------- applyCheckin: refusals ----------

describe('career logic: applyCheckin refuses done and NextWeek actions', () => {
  for (const kind of ['done', 'not_today']) {
    test(`a done action cannot take ${kind}`, () => {
      const week = weekFrom([['Tue', 'done'], ['Thu'], ['Sat']]);
      const r = logic.applyCheckin(week, 'a1', kind, 'Thu');
      assert.equal(r.ok, false);
      assert.equal(r.reason, 'not-checkable');
      assert.deepEqual(r.week, week);
      assert.equal(r.shareCard, null);
    });

    test(`a NextWeek action cannot take ${kind}`, () => {
      const week = weekFrom([['Tue'], ['Thu'], ['NextWeek', 'moved', 1]]);
      const r = logic.applyCheckin(week, 'a3', kind, 'Thu');
      assert.equal(r.ok, false);
      assert.equal(r.reason, 'not-checkable');
    });
  }

  test('unknown action, unknown kind and bad today are refused', () => {
    const week = weekFrom([['Tue'], ['Thu'], ['Sat']]);
    assert.equal(logic.applyCheckin(week, 'nope', 'done', 'Thu').reason, 'unknown-action');
    assert.equal(logic.applyCheckin(week, 'a1', 'skip', 'Thu').reason, 'invalid-kind');
    assert.equal(logic.applyCheckin(week, 'a1', 'not_today', 'Someday').reason, 'invalid-today');
  });

  test('a moved action (not NextWeek) can still be Done', () => {
    const week = weekFrom([['Fri', 'moved', 1], ['Thu'], ['Sat']]);
    const r = logic.applyCheckin(week, 'a1', 'done', 'Thu');
    assert.equal(r.ok, true);
    assert.equal(r.week.actions[0].status, 'done');
  });

  test('checkableActions lists todo and moved actions that are not NextWeek', () => {
    const week = weekFrom([['Tue', 'done'], ['Fri', 'moved', 1], ['NextWeek', 'moved', 1]]);
    assert.deepEqual(logic.checkableActions(week).map((a) => a.id), ['a2']);
  });
});

// ---------- applyCheckin: Done, share card, comeback ----------

describe('career logic: applyCheckin done', () => {
  test('the first Done of the week returns a share card once', () => {
    const week = logic.buildWeek(DRAFT, 'Thu');
    const r1 = logic.applyCheckin(week, 'a1', 'done', 'Thu');
    assert.equal(r1.ok, true);
    assert.ok(r1.shareCard);
    assert.equal(r1.shareCard.pathTitle, 'Role A');
    assert.equal(r1.shareCard.actionTitle, 'Write a before/after page');
    assert.equal(r1.shareCard.progress, '1/3 done');
    assert.match(r1.shareCard.text, /1\/3 done/);
    const r2 = logic.applyCheckin(r1.week, 'a2', 'done', 'Thu');
    assert.equal(r2.shareCard, null);
  });

  test('the share card carries no personal data or numbers beyond progress', () => {
    const r = logic.applyCheckin(logic.buildWeek(DRAFT, 'Thu'), 'a1', 'done', 'Thu');
    assert.doesNotMatch(r.shareCard.text, /Dana|minutes|\d+ min/i);
  });

  test('the first Done after a Not today carries a comeback line, only once', () => {
    const week = logic.buildWeek(DRAFT, 'Thu');
    const nt = logic.applyCheckin(week, 'a1', 'not_today', 'Thu');
    assert.equal(nt.week.pendingComeback, true);
    const d1 = logic.applyCheckin(nt.week, 'a2', 'done', 'Thu');
    assert.equal(d1.comeback, 'Welcome back. Showing up again is the hard part.');
    assert.ok(d1.shareCard, 'it is also the first Done of the week');
    assert.equal(d1.week.pendingComeback, false);
    const d2 = logic.applyCheckin(d1.week, 'a1', 'done', 'Thu');
    assert.equal(d2.comeback, null);
    assert.equal(d2.shareCard, null);
  });

  test('a Done without an earlier Not today has no comeback line', () => {
    const r = logic.applyCheckin(logic.buildWeek(DRAFT, 'Thu'), 'a1', 'done', 'Thu');
    assert.equal(r.comeback, null);
    assert.equal(r.adjustment, null);
  });
});

// ---------- summary ----------

describe('career logic: summary string', () => {
  test('done/total done, plus moved count (NextWeek counts as moved), moved part dropped at 0', () => {
    assert.equal(logic.weekSummary(weekFrom([['Tue'], ['Thu'], ['Sat']]).actions), '0/3 done');
    assert.equal(logic.weekSummary(weekFrom([['Tue', 'done'], ['Fri', 'moved', 1], ['Sat']]).actions), '1/3 done · 1 moved');
    assert.equal(logic.weekSummary(weekFrom([['Tue', 'done'], ['Fri', 'moved', 1], ['NextWeek', 'moved', 1]]).actions), '1/3 done · 2 moved');
  });

  test('applyCheckin keeps week.summary current', () => {
    const week = logic.buildWeek(DRAFT, 'Thu');
    const d = logic.applyCheckin(week, 'a1', 'done', 'Thu');
    assert.equal(d.week.summary, '1/3 done');
    const n = logic.applyCheckin(d.week, 'a2', 'not_today', 'Thu');
    assert.equal(n.week.summary, '1/3 done · 1 moved');
  });
});

// ---------- re-choosing a path ----------

describe('career logic: re-choosing a path resets the week', () => {
  test('a new buildWeek clears check-ins, moves, share card and comeback state', () => {
    let week = logic.buildWeek(DRAFT, 'Thu');
    week = logic.applyCheckin(week, 'a1', 'not_today', 'Thu').week;
    week = logic.applyCheckin(week, 'a2', 'done', 'Thu').week;
    week = logic.applyCheckin(week, 'a3', 'not_today', 'Thu').week;
    assert.equal(week.pendingComeback, true);

    const other = { ...DRAFT, role_id: 'r-b', title: 'Role B' };
    const fresh = logic.buildWeek(other, 'Thu');
    assert.equal(fresh.pathId, 'r-b');
    assert.equal(fresh.summary, '0/3 done');
    assert.equal(fresh.pendingComeback, false);
    assert.deepEqual(fresh.actions.map((a) => [a.status, a.moves]), [['todo', 0], ['todo', 0], ['todo', 0]]);

    const first = logic.applyCheckin(fresh, 'a1', 'done', 'Thu');
    assert.ok(first.shareCard, 'share card shows again for the new path');
    assert.equal(first.comeback, null, 'no comeback carried over from the old path');
  });
});

// ---------- sizeForCondition ----------

describe('career logic: sizeForCondition', () => {
  const week = logic.buildWeek(DRAFT, 'Thu');

  for (const condition of [1, 2]) {
    test(`condition ${condition} shows the 10-minute version of each action`, () => {
      const shown = logic.sizeForCondition(week, condition);
      assert.equal(shown.length, 3);
      assert.deepEqual(shown.map((a) => a.title), week.actions.map((a) => a.short));
      assert.ok(shown.every((a) => a.minutes <= 10 && a.reduced === true));
      assert.deepEqual(shown.map((a) => a.fullTitle), week.actions.map((a) => a.title));
      assert.deepEqual(shown.map((a) => a.id), ['a1', 'a2', 'a3']);
    });
  }

  for (const condition of [3, 4, 5, null, undefined]) {
    test(`condition ${condition} keeps the original size`, () => {
      const shown = logic.sizeForCondition(week, condition);
      assert.deepEqual(shown.map((a) => a.title), week.actions.map((a) => a.title));
      assert.deepEqual(shown.map((a) => a.minutes), week.actions.map((a) => a.minutes));
      assert.ok(shown.every((a) => a.reduced === false));
    });
  }

  test('keeps status and day so check-in rules still apply, does not mutate', () => {
    const copy = JSON.parse(JSON.stringify(week));
    const moved = logic.applyCheckin(week, 'a1', 'not_today', 'Thu').week;
    const shown = logic.sizeForCondition(moved, 1);
    assert.equal(shown[0].status, 'moved');
    assert.equal(shown[0].day, 'Fri');
    assert.deepEqual(week, copy);
  });
});

// ---------- progressSignals (P2) ----------

describe('career logic: progressSignals', () => {
  test('no check-ins: starting momentum, medium risk, zero days', () => {
    const p = logic.progressSignals([], []);
    assert.equal(p.momentum, 'starting');
    assert.equal(p.dropoutRisk, 'medium');
    assert.equal(p.daysShownUp, 0);
    assert.deepEqual(p.evidence, []);
  });

  test('days shown up counts distinct days with any check-in (not a streak)', () => {
    const checkins = [
      { actionId: 'a1', kind: 'not_today', day: 'Tue' },
      { actionId: 'a2', kind: 'done', day: 'Tue' },
      { actionId: 'a1', kind: 'done', day: 'Thu' },
    ];
    const p = logic.progressSignals(checkins, []);
    assert.equal(p.daysShownUp, 2);
    assert.equal(p.dropoutRisk, 'low');
    assert.equal(p.evidence.filter((e) => e.type === 'checkin').length, 3);
  });

  test('trailing Not todays raise dropout risk', () => {
    const one = [{ actionId: 'a1', kind: 'done', day: 'Mon' }, { actionId: 'a2', kind: 'not_today', day: 'Tue' }];
    assert.equal(logic.progressSignals(one, []).dropoutRisk, 'medium');
    const two = [...one, { actionId: 'a3', kind: 'not_today', day: 'Wed' }];
    assert.equal(logic.progressSignals(two, []).dropoutRisk, 'high');
  });

  test('momentum uses done, not today and recent lifelog days; evidence lists what counted', () => {
    const checkins = [{ actionId: 'a1', kind: 'done', day: 'Mon' }, { actionId: 'a2', kind: 'done', day: 'Tue' }];
    const p = logic.progressSignals(checkins, LIFELOG);
    // 2 x 2 done + min(3, recent lifelog days) = 4 + 3 = 7 -> strong
    assert.equal(p.momentumScore, 7);
    assert.equal(p.momentum, 'strong');
    const life = p.evidence.filter((e) => e.type === 'lifelog');
    assert.equal(life.length, 3);
    assert.deepEqual(life.map((e) => e.id), ['l6', 'l5', 'l4']);
    assert.equal(typeof p.rules.momentum, 'string');
    assert.equal(typeof p.rules.dropoutRisk, 'string');
  });

  test('a single Done is building momentum', () => {
    const p = logic.progressSignals([{ actionId: 'a1', kind: 'done', day: 'Mon' }], []);
    assert.equal(p.momentum, 'starting'); // score 2
    const q = logic.progressSignals([{ actionId: 'a1', kind: 'done', day: 'Mon' }, { actionId: 'a2', kind: 'not_today', day: 'Tue' }], []);
    assert.equal(q.momentumScore, 3);
    assert.equal(q.momentum, 'building');
  });
});

// ---------- withTrace ----------

describe('career logic: withTrace', () => {
  test('wraps a function: same result, plus a trace entry with name and summaries', () => {
    const traced = logic.withTrace('skillOverlap', logic.skillOverlap);
    const { result, trace } = traced(['pricing'], ROLES[0]);
    assert.deepEqual(result, logic.skillOverlap(['pricing'], ROLES[0]));
    assert.equal(trace.fn, 'skillOverlap');
    assert.equal(trace.via, 'logic');
    assert.equal(typeof trace.input, 'string');
    assert.equal(typeof trace.output, 'string');
    assert.ok(trace.input.length > 0 && trace.input.length <= 240);
    assert.match(trace.output, /ratio/);
  });

  test('custom summaries and via are used when given', () => {
    const traced = logic.withTrace('rankRoles', logic.rankRoles, {
      input: (skills) => `${skills.length} skills`,
      output: (roles) => roles.map((r) => r.id).join(', '),
    });
    const { trace } = traced(['brand-voice'], ROLES);
    assert.equal(trace.input, '1 skills');
    assert.equal(trace.output, 'r-b, r-d, r-a');
  });

  test('summarizeForTrace keeps text short and never throws', () => {
    assert.equal(logic.summarizeForTrace(undefined), 'undefined');
    assert.ok(logic.summarizeForTrace('x'.repeat(1000)).length <= 240);
    assert.match(logic.summarizeForTrace([1, 2, 3]), /3/);
  });
});
