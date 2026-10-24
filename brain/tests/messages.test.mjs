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

  test('CARRIED ack states the move count: default 2, or the moves slot', () => {
    assert.equal(messages.render('CARRIED', SAMPLE_SLOTS).ack, 'Draft a pilot offer email has moved 2 times.');
    assert.equal(messages.render('CARRIED', { ...SAMPLE_SLOTS, moves: 3 }).ack, 'Draft a pilot offer email has moved 3 times.');
    assert.equal(messages.fillSlots({}).moves, 2);
    assert.equal(messages.fillSlots({ moves: 'x' }).moves, 2);
  });

  test('every key renders clean even when every text slot carries a banned word', () => {
    const poisoned = Object.fromEntries(messages.TEXT_SLOTS.map((k, i) => [k, `${messages.BANNED_WORDS[i % messages.BANNED_WORDS.length]} ${k}`]));
    const slots = { ...SAMPLE_SLOTS, ...poisoned };
    for (const key of messages.MESSAGE_KEYS) {
      const out = messages.render(key, slots);
      assert.equal(out.lint.ok, true, `${key}: ${out.lint.hits.join(', ')}`);
      assert.deepEqual(out.lint.scrubbed, messages.TEXT_SLOTS);
      assert.ok(!/undefined|NaN|\bnull\b/.test(out.text), `${key}: ${out.text}`);
    }
    assert.deepEqual(messages.cleanSlots(slots).scrubbed, messages.TEXT_SLOTS);
  });

  test('cleanSlots keeps a slot whose only "missed" is the allowed rest-day phrase', () => {
    const { slots, scrubbed } = messages.cleanSlots({ ...SAMPLE_SLOTS, micro_title: 'Write "not a missed day" on a card' });
    assert.deepEqual(scrubbed, []);
    assert.equal(slots.micro_title, 'Write "not a missed day" on a card');
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

  test('the literal "not a missed day" is allowed; "missed" elsewhere is not', () => {
    assert.equal(messages.lint('Today was a rest day, not a missed day.').ok, true);
    assert.equal(messages.lint('That was a missed day.').ok, false);
    assert.equal(messages.lint('Not a Missed Day at all.').ok, true);
    assert.equal(messages.lint('You missed it.').ok, false);
    assert.deepEqual(messages.lint('Not a missed day; still, you missed the call.').hits, ['missed']);
    assert.deepEqual(messages.lint(['Today was a rest day, not a missed day.', 'Tomorrow is open.']), { ok: true, hits: [] });
  });

  test('BANNED_WORDS is the full §5.1 list and every token is caught case-insensitively', () => {
    const required = ['fail', 'fails', 'failed', 'failing', 'failure', 'failures', 'missed', 'broke', 'broken', 'streak', 'streaks',
      'behind', 'lazy', 'should', 'must', 'excuse', 'excuses', 'just', 'because you', 'since you', 'you seemed'];
    for (const word of required) assert.ok(messages.BANNED_WORDS.includes(word), `BANNED_WORDS has "${word}"`);
    const title = (w) => w.replace(/\b\w/g, (c) => c.toUpperCase());
    for (const word of messages.BANNED_WORDS) {
      for (const variant of [word, word.toUpperCase(), title(word)]) {
        const out = messages.lint(`Well, ${variant} here.`);
        assert.equal(out.ok, false, variant);
        assert.deepEqual(out.hits.map((h) => h.toLowerCase()), [word], variant);
      }
    }
  });

  test('must/should/behind/just/excuse/broke/missed/fail are caught', () => {
    const sentences = [
      'You must send it today.',
      'You should start earlier.',
      'You are behind on the plan.',
      'Just do the small one.',
      'No excuse this time.',
      'The plan broke last week.',
      'You missed Tuesday.',
      "Don't fail again.",
    ];
    assert.deepEqual(sentences.map((s) => messages.lint(s).hits.map((h) => h.toLowerCase())),
      [['must'], ['should'], ['behind'], ['just'], ['excuse'], ['broke'], ['missed'], ['fail']]);
  });

  test('cause-assigning phrases are caught, with any whitespace between the words', () => {
    assert.deepEqual(messages.lint('It slipped because you were tired.').hits, ['because you']);
    assert.deepEqual(messages.lint('Since you skipped Monday, Wednesday is open.').hits, ['Since you']);
    assert.deepEqual(messages.lint('You seemed distracted.').hits, ['You seemed']);
    assert.deepEqual(messages.lint('because\n you').hits, ['because\n you']);
    assert.equal(messages.lint('Because the week was heavy, the step moved.').ok, true);
  });

  test('whole words only: adjust, justify, mustard, broker, fail-safe compounds pass', () => {
    for (const text of ['Adjust the plan.', 'Justify nothing.', 'Mustard on the side.', 'The broker called.', 'Failsafe design.', 'Streaky paint.', 'Behindhand, as a word.']) {
      assert.deepEqual(messages.lint(text), { ok: true, hits: [] }, text);
    }
  });

  test('lint is stateless: same input twice gives the same result, whatever ran before', () => {
    const dirty = 'You should not feel lazy; the streak is a myth.';
    const first = messages.lint(dirty);
    assert.deepEqual(first, { ok: false, hits: ['should', 'lazy', 'streak'] });
    assert.deepEqual(messages.lint(dirty), first);
    assert.deepEqual(messages.lint('clean line'), { ok: true, hits: [] });
    assert.deepEqual(messages.lint(dirty), first);
    // A caller that runs .test() on the exported /g regex leaves lastIndex behind; lint ignores it.
    assert.equal(messages.BANNED_PATTERN.test(dirty), true);
    assert.notEqual(messages.BANNED_PATTERN.lastIndex, 0);
    assert.deepEqual(messages.lint(dirty), first);
    assert.deepEqual(messages.lint('Not a missed day.'), { ok: true, hits: [] });
    assert.equal(messages.ALLOWED_PHRASE.test('not a missed day'), true);
    assert.deepEqual(messages.lint('Not a missed day.'), { ok: true, hits: [] });
    messages.BANNED_PATTERN.lastIndex = 0;
    messages.ALLOWED_PHRASE.lastIndex = 0;
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
