// messages.test.mjs — render and lint for every message key.
// Run: cd brain && node --test tests/
// Every slot value here is synthetic. Sample persona — synthetic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as messages from '../messages.js';
import { REST_DAY_LINE } from '../../app/logic.js';

const SAMPLE_SLOTS = {
  action: 'Draft a pilot offer email',
  minutes: 25,
  done: 1,
  planned: 3,
  showed_up: 9,
  next_day: 'Fri',
  next_action: 'List seven discovery questions',
  next_min: 20,
  moved_day: 'Thu',
  micro_min: 10,
  micro_title: 'Write only the subject line',
  cond: 2,
  capacity: 12,
  gate: 'Fit gate',
  evidence: 'one messaging session booked',
  next_gate: 'Proof',
  weeks: 3,
  done_4w: 7,
};

describe('render', () => {
  test('every key renders ack -> reframe -> next and passes lint (sample slots)', () => {
    for (const key of messages.MESSAGE_KEYS) {
      const out = messages.render(key, SAMPLE_SLOTS);
      assert.equal(out.key, key);
      assert.ok(out.ack && out.reframe && out.next, `${key} has all three parts`);
      assert.equal(out.text, `${out.ack}\n${out.reframe}\n${out.next}`);
      assert.equal(out.lint.ok, true, `${key} lint hits: ${out.lint.hits.join(', ')}`);
      assert.deepEqual(messages.lint(out.text), { ok: true, hits: [] });
      assert.ok(!/undefined|NaN|\bnull\b/.test(out.text), `${key} has no empty slot text`);
    }
  });

  test('every key renders cleanly with no slots at all', () => {
    for (const key of messages.MESSAGE_KEYS) {
      const out = messages.render(key, undefined);
      assert.equal(out.lint.ok, true, `${key} lint hits: ${out.lint.hits.join(', ')}`);
      assert.ok(!/undefined|NaN|\bnull\b/.test(out.text), `${key}: ${out.text}`);
    }
  });

  test('REST first line is exactly the rest-day line', () => {
    const out = messages.render('REST', SAMPLE_SLOTS);
    assert.equal(out.ack, 'Today was a rest day, not a missed day.');
    assert.equal(out.ack, REST_DAY_LINE);
    assert.equal(out.text.split('\n')[0], 'Today was a rest day, not a missed day.');
    assert.equal(out.reframe, '1/3 are already done this week.');
    assert.equal(out.next, "Thu's step moves to Fri — 10 minutes is enough.");
  });

  test('slots are substituted', () => {
    assert.equal(messages.render('DONE', SAMPLE_SLOTS).ack, 'Draft a pilot offer email — done.');
    assert.equal(messages.render('DONE', SAMPLE_SLOTS).next, 'Next: Fri, List seven discovery questions (20 min).');
    assert.equal(messages.render('LOW_ENERGY', SAMPLE_SLOTS).ack, 'Energy 2/5 today.');
    assert.equal(messages.render('GATE_PASS', SAMPLE_SLOTS).ack, 'Fit gate passed: one messaging session booked.');
    assert.equal(messages.render('RECONNECT', SAMPLE_SLOTS).next, 'Today is a fresh page: one 10-minute step, Write only the subject line?');
    assert.equal(messages.render('CARRIED', SAMPLE_SLOTS).next, 'One question: is it the wrong step, or the wrong size?');
  });

  test('an unknown key falls back to NONE without throwing', () => {
    const out = messages.render('NOPE', SAMPLE_SLOTS);
    assert.equal(out.key, 'NONE');
    assert.equal(out.requestedKey, 'NOPE');
    assert.equal(out.lint.ok, true);
  });

  test('renderAll covers every key once', () => {
    const all = messages.renderAll(SAMPLE_SLOTS);
    assert.deepEqual(all.map((m) => m.key), messages.MESSAGE_KEYS);
  });

  test('a text slot carrying a banned phrase is replaced by its neutral default and named in lint.scrubbed', () => {
    const slots = { ...SAMPLE_SLOTS, action: 'Rewrite the failed page because you missed day one', micro_title: 'Fix the streak' };
    for (const key of messages.MESSAGE_KEYS) {
      const out = messages.render(key, slots);
      assert.equal(out.lint.ok, true, `${key}: ${out.lint.hits.join(', ')}`);
      assert.deepEqual(messages.lint(out.text), { ok: true, hits: [] });
    }
    const low = messages.render('LOW_ENERGY', slots);
    assert.deepEqual(low.lint.scrubbed, ['action', 'micro_title']);
    assert.ok(low.next.includes("today's step") && low.next.includes('the 10-minute version'));
    assert.deepEqual(messages.render('LOW_ENERGY', SAMPLE_SLOTS).lint.scrubbed, []);
    assert.deepEqual(messages.cleanSlots(slots).scrubbed, ['action', 'micro_title']);
  });
});

describe('lint', () => {
  test('"you failed" is rejected', () => {
    const out = messages.lint('Looks like you failed this one.');
    assert.equal(out.ok, false);
    assert.deepEqual(out.hits, ['failed']);
  });

  test('the literal "not a missed day" is allowed; "missed day" elsewhere is not', () => {
    assert.equal(messages.lint('Today was a rest day, not a missed day.').ok, true);
    assert.equal(messages.lint('That was a missed day.').ok, false);
    assert.equal(messages.lint('Not a Missed Day at all.').ok, true);
  });

  test('other banned phrases are caught case-insensitively', () => {
    for (const text of ['Keep your STREAK alive', 'You should have done it', "Don't be lazy", 'It broke because you waited', 'A failure, then']) {
      assert.equal(messages.lint(text).ok, false, text);
    }
    assert.deepEqual(messages.lint('streak and Failure').hits, ['streak', 'Failure']);
  });

  test('lint accepts arrays and odd input', () => {
    assert.equal(messages.lint(['Done', 'Not today']).ok, true);
    assert.equal(messages.lint(null).ok, true);
    assert.equal(messages.lint(['fine', 'you failed']).ok, false);
  });
});
