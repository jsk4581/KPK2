// constraint.test.mjs — classifyBlocker and rootConstraint.
// Run: cd brain && node --test tests/
// Every value here is synthetic. Sample persona — synthetic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as constraint from '../constraint.js';

const nt = (actionId, date, reason, extra = {}) => ({ actionId, kind: 'not_today', day: 'Thu', date, reason, ...extra });

describe('classifyBlocker', () => {
  test('maps the five reason chips to COM-B', () => {
    assert.equal(constraint.classifyBlocker('time'), 'opportunity-time');
    assert.equal(constraint.classifyBlocker('energy'), 'motivation-automatic');
    assert.equal(constraint.classifyBlocker('mood'), 'motivation-automatic');
    assert.equal(constraint.classifyBlocker('skill'), 'capability');
    assert.equal(constraint.classifyBlocker('people'), 'opportunity-social');
    assert.equal(constraint.classifyBlocker('unknown'), 'unknown');
  });

  test('roadmap reason names and casing are accepted; garbage is unknown', () => {
    assert.equal(constraint.classifyBlocker('no_time'), 'opportunity-time');
    assert.equal(constraint.classifyBlocker('Low Energy'), 'motivation-automatic');
    assert.equal(constraint.classifyBlocker('waiting-on-someone'), 'opportunity-social');
    assert.equal(constraint.classifyBlocker(''), 'unknown');
    assert.equal(constraint.classifyBlocker(null), 'unknown');
    assert.equal(constraint.classifyBlocker(42), 'unknown');
  });
});

describe('rootConstraint', () => {
  test('time x2 (recent) + energy x1 (older) -> opportunity-time with the two ids as evidence', () => {
    const checkins = [nt('a1', '2026-10-13', 'energy'), nt('a2', '2026-10-15', 'time'), nt('a3', '2026-10-16', 'time')];
    const r = constraint.rootConstraint({ checkins, lifelog: [], today: '2026-10-16' });
    assert.equal(r.constraint, 'opportunity-time');
    assert.equal(r.score, 1.5);
    assert.deepEqual(r.evidence, ['a3@2026-10-16', 'a2@2026-10-15']);
    assert.equal(r.scores['motivation-automatic'], 0.25);
  });

  test('recency weighting: one reason today outweighs two from 10+ days ago', () => {
    const checkins = [nt('a1', '2026-10-04', 'time'), nt('a2', '2026-10-06', 'time'), nt('a3', '2026-10-16', 'energy')];
    const r = constraint.rootConstraint({ checkins, lifelog: [], today: '2026-10-16' });
    assert.equal(r.constraint, 'motivation-automatic');
    assert.deepEqual(r.evidence, ['a3@2026-10-16']);
  });

  test('weight is 1/(1+ageDays)', () => {
    assert.equal(constraint.recencyWeight(0), 1);
    assert.equal(constraint.recencyWeight(1), 0.5);
    assert.equal(constraint.recencyWeight(7), 0.125);
    assert.equal(constraint.recencyWeight(-3), 1);
  });

  test('no reasons -> unknown, never guessed from done/not_today alone', () => {
    const checkins = [{ actionId: 'a1', kind: 'not_today', day: 'Thu', date: '2026-10-15' }, { actionId: 'a2', kind: 'done', day: 'Fri' }];
    const r = constraint.rootConstraint({ checkins, lifelog: [] });
    assert.equal(r.constraint, 'unknown');
    assert.equal(r.score, 0);
    assert.deepEqual(r.evidence, []);
    assert.equal(r.reason, 'no_reasons');
    assert.equal(constraint.rootConstraint({}).constraint, 'unknown');
    assert.equal(constraint.rootConstraint(null).constraint, 'unknown');
  });

  test('only unknown chips -> unknown with reason reasons_unknown', () => {
    const r = constraint.rootConstraint({ checkins: [nt('a1', '2026-10-15', 'unknown')], lifelog: [] });
    assert.equal(r.constraint, 'unknown');
    assert.equal(r.reason, 'reasons_unknown');
  });

  test('an exact tie is not resolved by guessing', () => {
    const checkins = [nt('a1', '2026-10-15', 'time'), nt('a2', '2026-10-15', 'skill')];
    const r = constraint.rootConstraint({ checkins, lifelog: [], today: '2026-10-15' });
    assert.equal(r.constraint, 'unknown');
    assert.equal(r.reason, 'tie');
    assert.deepEqual(r.tie, ['capability', 'opportunity-time']);
  });

  test('lifelog blocker_reason counts and today defaults to the latest dated event', () => {
    const lifelog = [
      { _label: 'synthetic', id: 'l1', date: '2026-10-14', source: 'note', title: 'x', summary: 'y', tags: [], url: null, blocker_reason: 'people' },
      { _label: 'synthetic', id: 'l2', date: '2026-10-15', source: 'note', title: 'x', summary: 'y', tags: [], url: null },
    ];
    const r = constraint.rootConstraint({ checkins: [], lifelog });
    assert.equal(r.constraint, 'opportunity-social');
    assert.equal(r.score, 0.5);
    assert.deepEqual(r.evidence, ['l1']);
  });

  test('weekday-only check-ins resolve against today; dateless ones use list order', () => {
    const checkins = [
      { actionId: 'a1', kind: 'not_today', day: 'Mon', reason: 'skill' },
      { actionId: 'a2', kind: 'not_today', day: 'Thu', reason: 'time' },
    ];
    const withToday = constraint.rootConstraint({ checkins, lifelog: [], today: '2026-10-15' });
    assert.equal(withToday.constraint, 'opportunity-time');
    assert.equal(withToday.score, 1);
    const noToday = constraint.rootConstraint({ checkins, lifelog: [] });
    assert.equal(noToday.constraint, 'opportunity-time');
    assert.deepEqual(noToday.evidence, ['a2@Thu']);
  });

  test('explicit check-in ids are used as evidence ids; inputs are not mutated', () => {
    const checkins = [nt('a1', '2026-10-15', 'time', { id: 'c-7' })];
    const snapshot = JSON.stringify(checkins);
    const r = constraint.rootConstraint({ checkins, lifelog: [], today: '2026-10-15' });
    assert.deepEqual(r.evidence, ['c-7']);
    assert.equal(JSON.stringify(checkins), snapshot);
  });
});
