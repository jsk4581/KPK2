// evidence.test.mjs — the evidence ledger (ALGORITHM_DESIGN §7.1): done -> shelf entry, Not today -> nothing.
// Run from brain/: node --test tests/evidence.test.mjs   All fixtures are inline and synthetic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { buildLedger, classifyArtifact, gateFor, gateForWeek, pastTense, buildBullet, GATE_IDS, ARTIFACT_TYPES } from '../evidence.js';
import { lint } from '../messages.js';
import { loadScenario } from '../index.js';

// The vendor word must never appear in any output; the regex is assembled so it is not written here.
const FORBIDDEN = new RegExp(['Gem', 'ini'].join('') + '|' + ['제미', '나이'].join(''), 'i');

const WEEK = {
  actions: [
    { id: 'a1', title: 'Write a before/after page', minutes: 25, day: 'Tue', status: 'done', moves: 0, short: 'Write only the headline' },
    { id: 'a2', title: 'Draft a pilot offer email', minutes: 30, day: 'Thu', status: 'moved', moves: 1, short: 'Write only the subject line' },
    { id: 'a3', title: 'List seven discovery questions', minutes: 20, day: 'Sat', status: 'todo', moves: 0, short: 'Write two questions' },
  ],
  summary: '1/3 done · 1 moved',
  pathId: 'messaging-consultant',
  pathTitle: 'Messaging & Positioning Consultant',
  today: 'Sat',
  pendingComeback: false,
};

const PATH = { role_id: 'messaging-consultant', title: 'Messaging & Positioning Consultant', requires: ['discovery-call', 'positioning', 'case-studies'] };

const SKILLS = [
  { id: 'case-studies', name: 'Case studies', keywords: ['case study'] },
  { id: 'positioning', name: 'Positioning and messaging', keywords: ['positioning'] },
  { id: 'discovery-call', name: 'Discovery interviews', keywords: ['discovery call'] },
  { id: 'email-copy', name: 'Email copy', keywords: ['email'] },
];

const LIFELOG = [
  { id: 'l1', date: '2026-10-06', source: 'note', title: 'Before/after page: first project done', summary: 'One page, 25 minutes.', tags: ['case-studies', 'positioning'], url: null, _label: 'synthetic' },
  { id: 'l2', date: '2026-10-06', source: 'calendar', title: 'Client edit round', summary: 'Routine work.', tags: ['email-copy'], url: null, _label: 'synthetic' },
  { id: 'l3', date: '2026-10-08', source: 'note', title: 'Pilot offer email drafted', summary: 'Subject line reads fine.', tags: ['positioning'], url: null, _label: 'synthetic' },
  { id: 'l4', date: '2026-10-09', source: 'note', title: 'Rest day', summary: 'No work.', tags: [], url: null, _label: 'synthetic' },
];

const CHECKINS = [
  { actionId: 'a1', kind: 'done', day: 'Tue', date: '2026-10-06' },
  { actionId: 'a2', kind: 'not_today', day: 'Thu', date: '2026-10-08', blocker_reason: 'time' },
  { actionId: 'a2', kind: 'done', day: 'Fri', date: '2026-10-09', variant: 'micro' },
  { actionId: 'a3', kind: 'not_today', day: 'Sat', date: '2026-10-10' },
];

const BASE = { week: WEEK, checkins: CHECKINS, lifelog: LIFELOG, path: PATH, skills: SKILLS, arcStart: '2026-10-05', today: '2026-10-10' };

function allStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allStrings(v, out));
  return out;
}

describe('buildLedger: only done check-ins', () => {
  const ledger = buildLedger(BASE);

  test('one entry per done check-in; Not today never produces one', () => {
    assert.equal(ledger.count, 2);
    assert.equal(ledger.entries.length, 2);
    assert.deepEqual(ledger.entries.map((e) => e.actionId), ['a1', 'a2']);
    assert.ok(ledger.entries.every((e) => e.id.startsWith('ev:')));
    assert.ok(!ledger.entries.some((e) => e.id.includes('2026-10-10')), 'the Not today on a3 is not on the shelf');
    assert.ok(!ledger.entries.some((e) => e.id === 'ev:a2@2026-10-08'), 'the Not today on a2 is not on the shelf');
  });

  test('a micro variant is kept and flagged; a full step is "done"', () => {
    assert.deepEqual(ledger.entries.map((e) => e.kind), ['done', 'micro']);
    assert.deepEqual(ledger.byKind, { done: 1, micro: 1 });
    // minutes <= 10 also counts as micro; minutes above 10 or none is a full step.
    const byMinutes = buildLedger({ ...BASE, checkins: [{ actionId: 'a1', kind: 'done', day: 'Tue', date: '2026-10-06', minutes: 8 }, { actionId: 'a3', kind: 'done', day: 'Sat', date: '2026-10-10', minutes: 20 }] });
    assert.deepEqual(byMinutes.entries.map((e) => e.kind), ['micro', 'done']);
  });

  test('byGate sums to count and only names the four gates', () => {
    assert.deepEqual(Object.keys(ledger.byGate), GATE_IDS);
    assert.equal(Object.values(ledger.byGate).reduce((s, n) => s + n, 0), ledger.count);
    assert.deepEqual(ledger.byGate, { M1: 2, M2: 0, M3: 0, M4: 0 });
  });

  test('evidence ids point at the check-in and the lifelog items logged that day, all present in the input', () => {
    const [first, second] = ledger.entries;
    assert.deepEqual(first.evidence, ['a1@2026-10-06', 'l1', 'l2']);
    assert.deepEqual(second.evidence, ['a2@2026-10-09', 'l4']);
    const known = new Set([...LIFELOG.map((i) => i.id), 'a1@2026-10-06', 'a2@2026-10-09']);
    for (const entry of ledger.entries) for (const id of entry.evidence) assert.ok(known.has(id), id);
  });

  test('skill comes from the linked lifelog tags, preferring the path\'s requires; null when nothing is known', () => {
    assert.equal(ledger.entries[0].skill, 'case-studies');
    assert.equal(ledger.entries[1].skill, null);
    const explicit = buildLedger({ ...BASE, checkins: [{ actionId: 'a1', kind: 'done', date: '2026-10-06', skill: 'positioning' }] });
    assert.equal(explicit.entries[0].skill, 'positioning');
  });
});

describe('buildLedger: bullets', () => {
  const ledger = buildLedger(BASE);

  test('every bullet is non-empty English past tense, ends with a period, and passes lint', () => {
    for (const entry of ledger.entries) {
      assert.ok(entry.bullet.length > 20, entry.bullet);
      assert.ok(/^[A-Z][a-z]+ /.test(entry.bullet), `starts with a capitalised verb: ${entry.bullet}`);
      assert.ok(/\.$/.test(entry.bullet));
      assert.equal(lint(entry.bullet).ok, true, `lint hits: ${lint(entry.bullet).hits.join(', ')}`);
      assert.ok(!/undefined|NaN|\bnull\b/.test(entry.bullet), entry.bullet);
      assert.ok(!FORBIDDEN.test(entry.bullet));
      assert.equal(entry.scrubbed, false);
    }
    assert.equal(ledger.entries[0].bullet, 'Wrote a before/after page toward Messaging & Positioning Consultant, demonstrating case studies.');
    assert.equal(ledger.entries[1].bullet, 'Started "Draft a pilot offer email" toward Messaging & Positioning Consultant with a short step (write only the subject line).');
  });

  test('no number is invented: digits come only from the title or from logged minutes', () => {
    const noDigits = buildLedger({ ...BASE, checkins: [{ actionId: 'a1', kind: 'done', date: '2026-10-06' }, { actionId: 'a2', kind: 'done', date: '2026-10-09', variant: 'micro' }] });
    for (const entry of noDigits.entries) assert.ok(!/\d/.test(entry.bullet), entry.bullet);
    const logged = buildLedger({ ...BASE, checkins: [{ actionId: 'a2', kind: 'done', date: '2026-10-09', variant: 'micro', minutes: 10 }] });
    assert.match(logged.entries[0].bullet, /a 10-minute step/);
  });

  test('a title that trips lint gets the neutral bullet, flagged as scrubbed', () => {
    const week = { ...WEEK, actions: [{ id: 'a1', title: 'Write up the streak page', minutes: 20, day: 'Tue', status: 'done', moves: 0 }] };
    const out = buildLedger({ ...BASE, week, checkins: [{ actionId: 'a1', kind: 'done', date: '2026-10-06' }] });
    assert.equal(out.entries[0].scrubbed, true);
    assert.equal(out.entries[0].bullet, 'Completed one planned step toward Messaging & Positioning Consultant.');
    assert.equal(lint(out.entries[0].bullet).ok, true);
  });

  test('pastTense: known first verb is conjugated; unknown first word falls back to a quoted step', () => {
    assert.equal(pastTense('Write a before/after page'), 'Wrote a before/after page');
    assert.equal(pastTense('Send a short note to two past attendees'), 'Sent a short note to two past attendees');
    assert.equal(pastTense('With a 20-minute timer, list the 7 questions'), 'Completed the step "With a 20-minute timer, list the 7 questions"');
    assert.equal(pastTense(''), '');
  });

  test('buildBullet without a path or a skill still reads as a sentence', () => {
    assert.equal(buildBullet({ title: 'Read one job post', kind: 'done' }), 'Read one job post.');
    assert.equal(buildBullet({ title: 'Read one job post', kind: 'micro', microTitle: 'Read the first paragraph' }), 'Started "Read one job post" with a short step (read the first paragraph).');
    assert.equal(buildBullet({ title: 'Rewrite one screen', kind: 'done', skill: 'UX writing' }), 'Rewrote one screen, demonstrating UX writing.');
  });
});

describe('buildLedger: gates and artifact types', () => {
  test('gate: explicit milestone > check-in week > arc week from arcStart > M1', () => {
    assert.equal(gateFor({ checkin: { milestone: 'm3' }, action: {}, date: '2026-10-06', arcStart: '2026-10-05' }), 'M3');
    assert.equal(gateFor({ checkin: {}, action: { milestone: 'M2' }, date: '2026-10-06', arcStart: '2026-10-05' }), 'M2');
    assert.equal(gateFor({ checkin: { week: 8 }, action: {}, date: '2026-10-06', arcStart: '2026-10-05' }), 'M3');
    assert.equal(gateFor({ checkin: {}, action: {}, date: '2026-11-20', arcStart: '2026-10-05' }), 'M3');
    assert.equal(gateFor({ checkin: {}, action: {}, date: '2026-10-06', arcStart: null }), 'M1');
    assert.equal(gateFor({ checkin: {}, action: {}, date: null, arcStart: '2026-10-05' }), 'M1');
    assert.deepEqual([1, 2, 3, 6, 7, 9, 10, 12, 13].map(gateForWeek), ['M1', 'M1', 'M2', 'M2', 'M3', 'M3', 'M4', 'M4', 'M4']);
    assert.equal(gateForWeek('x'), null);
  });

  test('arcStart falls back to the path, then to the earliest dated event', () => {
    const fromPath = buildLedger({ ...BASE, arcStart: undefined, path: { ...PATH, arc_start: '2026-09-01' } });
    assert.equal(fromPath.arcStart, '2026-09-01');
    assert.equal(fromPath.entries[0].gate, 'M2'); // 2026-10-06 is week 6 of an arc that started 2026-09-01
    const fromEvents = buildLedger({ ...BASE, arcStart: undefined });
    assert.equal(fromEvents.arcStart, '2026-10-06');
  });

  test('artifact type: explicit field wins, else phrase rules on the title, else "step"', () => {
    assert.equal(classifyArtifact('Write a before/after page'), 'portfolio_piece');
    assert.equal(classifyArtifact('Send a short note to two past workshop attendees'), 'outreach');
    assert.equal(classifyArtifact('Coffee chat with a former agency strategist'), 'conversation');
    assert.equal(classifyArtifact('Apply to one lifecycle marketing role'), 'application');
    assert.equal(classifyArtifact('Pitch the session to one client'), 'pitch');
    assert.equal(classifyArtifact('Ask one peer for feedback on the page'), 'feedback');
    assert.equal(classifyArtifact('Walk the dog'), 'step');
    assert.equal(classifyArtifact('Walk the dog', 'Portfolio piece'), 'portfolio_piece');
    assert.equal(classifyArtifact('Walk the dog', 'not-a-type'), 'step');
    const ledger = buildLedger(BASE);
    assert.deepEqual(Object.keys(ledger.byType), ARTIFACT_TYPES);
    assert.equal(Object.values(ledger.byType).reduce((s, n) => s + n, 0), ledger.count);
  });
});

describe('buildLedger: determinism and bad input', () => {
  test('same input -> same output, and the input is not mutated', () => {
    const before = JSON.stringify(BASE);
    const a = buildLedger(BASE);
    const b = buildLedger(structuredClone(BASE));
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(BASE), before);
  });

  test('entries are in date order regardless of check-in order; undated last', () => {
    const shuffled = [
      { actionId: 'a3', kind: 'done', day: 'Sat' },
      { actionId: 'a2', kind: 'done', date: '2026-10-09', variant: 'micro' },
      { actionId: 'a1', kind: 'done', date: '2026-10-06' },
    ];
    const out = buildLedger({ ...BASE, checkins: shuffled, today: undefined });
    assert.deepEqual(out.entries.map((e) => [e.actionId, e.date]), [['a1', '2026-10-06'], ['a2', '2026-10-09'], ['a3', null]]);
    assert.deepEqual(out.entries[2].evidence, ['a3@Sat']);
  });

  test('a weekday-only check-in resolves its date from `today`', () => {
    const out = buildLedger({ ...BASE, checkins: [{ actionId: 'a1', kind: 'done', day: 'Tue' }], today: '2026-10-10' });
    assert.equal(out.entries[0].date, '2026-10-06');
    assert.deepEqual(out.entries[0].evidence, ['a1@Tue', 'l1', 'l2']);
  });

  test('empty, missing or malformed input -> an empty ledger, never a throw', () => {
    for (const input of [undefined, null, {}, { checkins: 'x' }, { checkins: [null, 1, { kind: 'done' }], week: 'nope' }]) {
      const out = buildLedger(input);
      assert.equal(Object.values(out.byGate).reduce((s, n) => s + n, 0), out.count);
      assert.ok(Array.isArray(out.entries));
      for (const entry of out.entries) assert.equal(lint(entry.bullet).ok, true);
    }
    assert.deepEqual(buildLedger({}), { entries: [], count: 0, byGate: { M1: 0, M2: 0, M3: 0, M4: 0 }, byType: Object.fromEntries(ARTIFACT_TYPES.map((t) => [t, 0])), byKind: { done: 0, micro: 0 }, arcStart: null });
    // A done check-in on an unknown action still counts, with a placeholder title.
    const stray = buildLedger({ checkins: [{ actionId: 'zz', kind: 'done', date: '2026-10-06' }] });
    assert.equal(stray.count, 1);
    assert.equal(stray.entries[0].title, 'Step zz');
    assert.equal(lint(stray.entries[0].bullet).ok, true);
  });

  test('no vendor word and no banned phrase anywhere in the output', () => {
    const text = allStrings(buildLedger(BASE)).join('\n');
    assert.ok(!FORBIDDEN.test(text));
    assert.equal(lint(text).ok, true);
  });
});

describe('buildLedger: synthetic Dana scenario', () => {
  const scenario = loadScenario();
  const lifelog = scenario.lifelog.filter((item) => ['note', 'saved_link', 'calendar'].includes(item.source));
  const ledger = buildLedger({ week: scenario.week, checkins: scenario.checkins, lifelog, path: scenario.path, today: scenario.today, arcStart: scenario.arc_start, skills: scenario.skills });

  test('six entries from six done check-ins (one micro); the two Not today check-ins are not on the shelf', () => {
    assert.equal(scenario._label, 'synthetic');
    assert.equal(ledger.count, 6);
    assert.deepEqual(ledger.byKind, { done: 5, micro: 1 });
    assert.equal(ledger.entries.find((e) => e.date === '2026-10-16').kind, 'micro');
    assert.deepEqual(ledger.byGate, { M1: 6, M2: 0, M3: 0, M4: 0 }); // all within weeks 1–2 of the arc
  });

  test('every bullet is lint-clean and cites ids that exist in the scenario', () => {
    const ids = new Set(scenario.lifelog.map((i) => i.id));
    for (const entry of ledger.entries) {
      assert.equal(lint(entry.bullet).ok, true, entry.bullet);
      assert.ok(entry.evidence.length >= 2, `${entry.id} links at least the check-in and one lifelog item`);
      for (const id of entry.evidence.slice(1)) assert.ok(ids.has(id), id);
    }
  });
});
