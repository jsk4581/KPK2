import { describe, expect, it } from 'vitest';
import * as logic from '@app/logic.js';
import persona from '@app/data/persona-dana.json';
import type { BrainScenario } from '../api/brain';
import { createInitialState, reducer } from '../state/store';
import type { AppState, CheckinRecord, Day, LifelogSource, RankedRole, Week } from '../state/types';
import scenarioJson from './__fixtures__/scenario.json';
import { SCENARIO_ID_PREFIX, demoTodayIso, isoForWeekday, toThinkInput } from './adapter';

const scenario = scenarioJson as unknown as BrainScenario;
const draft = persona.fallback.paths[0];
const ROLE: RankedRole = { id: draft.role_id, title: 'Messaging Consultant', ratio: 0.5, transfers: ['x'], missing: ['y'] };

function checkin(actionId: string, kind: 'done' | 'not_today', day: Day): CheckinRecord {
  return { actionId, kind, day, message: '', adjustment: null, shareCard: null, comeback: null };
}

function flowState(opts: { sample: boolean; sources?: LifelogSource[]; condition?: number | null }): AppState {
  let state = createInitialState();
  state = reducer(state, { type: 'prefillFields', fields: { career: 'Prefilled career', now: 'Prefilled now', pull: '' } });
  state = reducer(state, { type: 'editField', field: 'now', value: 'My own words, edited' });
  if (opts.sample) state = reducer(state, { type: 'connectLifelog' });
  if (opts.sources) state = reducer(state, { type: 'setEnabledSources', sources: opts.sources });
  state = reducer(state, { type: 'setRankedRoles', roles: [ROLE] });
  state = reducer(state, { type: 'setPaths', paths: { source: 'fallback', paths: [draft as never] } });
  const week = logic.buildWeek(draft, persona.today) as unknown as Week;
  state = reducer(state, { type: 'choosePath', pathId: draft.role_id, week });
  state = reducer(state, { type: 'addCheckin', record: checkin('a1', 'done', 'Thu') });
  state = reducer(state, { type: 'addCheckin', record: checkin('a2', 'not_today', 'Thu') });
  if (opts.condition !== undefined) state = reducer(state, { type: 'setCondition', condition: opts.condition });
  return state;
}

describe('isoForWeekday', () => {
  it('maps weekday labels onto the Monday-to-Sunday week that holds today', () => {
    // 2026-10-18 is a Sunday.
    expect(isoForWeekday('Mon', '2026-10-18')).toBe('2026-10-12');
    expect(isoForWeekday('Thu', '2026-10-18')).toBe('2026-10-15');
    expect(isoForWeekday('Sun', '2026-10-18')).toBe('2026-10-18');
    // 2026-10-15 is a Thursday: same week.
    expect(isoForWeekday('Mon', '2026-10-15')).toBe('2026-10-12');
    expect(isoForWeekday('Sun', '2026-10-15')).toBe('2026-10-18');
  });

  it('gives no date for NextWeek or a bad today', () => {
    expect(isoForWeekday('NextWeek', '2026-10-18')).toBeNull();
    expect(isoForWeekday('Thu', 'Thu')).toBeNull();
  });
});

describe('demoTodayIso', () => {
  it('is the persona today weekday in the week of its latest lifelog item', () => {
    // persona.today is Thu; the latest persona item is 2026-10-22, a Thursday.
    expect(persona.today).toBe('Thu');
    expect(demoTodayIso(persona)).toBe('2026-10-22');
    expect(demoTodayIso({ today: 'Mon', lifelog: [{ id: 'x', date: '2026-10-22', source: 'note' }] })).toBe('2026-10-19');
  });

  it('is null without a dated item or a weekday', () => {
    expect(demoTodayIso({ today: 'Thu', lifelog: [] })).toBeNull();
    expect(demoTodayIso({ today: 'Someday', lifelog: [{ id: 'x', date: '2026-10-22', source: 'note' }] })).toBeNull();
  });
});

describe('toThinkInput', () => {
  it('Start users send fields, ranked roles and the week only', () => {
    const state = flowState({ sample: false, condition: 2 });
    const input = toThinkInput(state, persona, scenario);
    expect(Object.keys(input).sort()).toEqual(['fields', 'rankedRoles', 'week']);
    expect(input.rankedRoles).toEqual([ROLE]);
    expect(input.week).toEqual(state.week);
  });

  it('passes fields exactly as edited on screen, never recomputed', () => {
    for (const sample of [false, true]) {
      const state = flowState({ sample });
      const input = toThinkInput(state, persona, sample ? scenario : null);
      expect(input.fields).toEqual({ career: 'Prefilled career', now: 'My own words, edited', pull: '' });
      expect(input.fields).toEqual(state.fields);
      expect(input.fields).not.toBe(state.fields);
    }
  });

  it('sample users send one timeline: our lifelog only, enabled sources only', () => {
    const state = flowState({ sample: true });
    const input = toThinkInput(state, persona, scenario);
    const enabled = new Set(['note', 'saved_link', 'calendar']);
    const ours = persona.lifelog.filter((i) => enabled.has(i.source));
    expect(input.enabledSources).toEqual(['note', 'saved_link', 'calendar']);
    expect(input.lifelog!.map((i) => i.id)).toEqual(ours.map((i) => i.id));
    // The scenario's lifelog (a second Dana timeline) never goes along.
    expect(input.lifelog!.some((i) => i.id.startsWith(SCENARIO_ID_PREFIX))).toBe(false);
    expect(new Set(input.lifelog!.map((i) => i.title)).size).toBe(input.lifelog!.length);
    expect(input.lifelog!.every((i) => i.date <= input.today!)).toBe(true);
  });

  it('drops lifelog items dated after the demo today', () => {
    const early = {
      today: 'Mon',
      lifelog: [
        { id: 'p1', date: '2026-10-19', source: 'note' },
        { id: 'p2', date: '2026-10-22', source: 'note' },
      ],
    };
    const input = toThinkInput(flowState({ sample: true }), early, null);
    expect(input.today).toBe('2026-10-19');
    expect(input.lifelog!.map((i) => i.id)).toEqual(['p1']);
  });

  it('sends scenario check-ins from earlier weeks only', () => {
    const withLate: BrainScenario = {
      ...scenario,
      checkins: [
        ...scenario.checkins,
        { actionId: 'a1', kind: 'done', day: 'Tue', date: '2026-10-20' },
        { actionId: 'a2', kind: 'done', day: 'Tue' },
      ],
    };
    const input = toThinkInput(flowState({ sample: true }), persona, withLate);
    const history = input.checkins!.filter((c) => c.actionId.startsWith(SCENARIO_ID_PREFIX));
    expect(history.map((c) => c.date)).toEqual(scenario.checkins.map((c) => c.date));
    // The demo week starts on Monday 2026-10-19.
    expect(history.every((c) => c.date! < '2026-10-19')).toBe(true);
  });

  it('follows the source toggles', () => {
    const state = flowState({ sample: true, sources: ['note', 'sms'] });
    const input = toThinkInput(state, persona, scenario);
    expect(input.enabledSources).toEqual(['note', 'sms']);
    expect(new Set(input.lifelog!.map((i) => i.source))).toEqual(new Set(['note', 'sms']));
  });

  it('appends session check-ins after the history, dated in the demo week', () => {
    const state = flowState({ sample: true });
    const input = toThinkInput(state, persona, scenario);
    const history = scenario.checkins.length;
    expect(input.checkins).toHaveLength(history + 2);
    expect(input.checkins!.slice(0, history).every((c) => c.actionId.startsWith(SCENARIO_ID_PREFIX))).toBe(true);
    expect(input.checkins!.slice(0, history).map((c) => c.date)).toEqual(scenario.checkins.map((c) => c.date));
    expect(input.checkins!.slice(history)).toEqual([
      { actionId: 'a1', kind: 'done', day: 'Thu', date: '2026-10-22' },
      { actionId: 'a2', kind: 'not_today', day: 'Thu', date: '2026-10-22' },
    ]);
    // The demo today (the Week screen's day), not the scenario's own today.
    expect(input.today).toBe('2026-10-22');
    expect(input.today).not.toBe(scenario.today);
  });

  it('sends the chosen path, this week and the picked condition', () => {
    const state = flowState({ sample: true, condition: 2 });
    const input = toThinkInput(state, persona, scenario);
    expect(input.path).toMatchObject({ role_id: draft.role_id, title: ROLE.title, one_liner: draft.one_liner });
    expect(input.week).toEqual(state.week);
    expect(input.condition).toBe(2);
    expect('condition' in toThinkInput(flowState({ sample: true }), persona, scenario)).toBe(false);
  });

  it('without the scenario: our lifelog only, still dated on the demo today', () => {
    const state = flowState({ sample: true });
    const input = toThinkInput(state, persona, null);
    expect(input.lifelog!.map((i) => i.id)).toEqual(
      persona.lifelog.filter((i) => ['note', 'saved_link', 'calendar'].includes(i.source)).map((i) => i.id),
    );
    expect(input.checkins).toEqual([
      { actionId: 'a1', kind: 'done', day: 'Thu', date: '2026-10-22' },
      { actionId: 'a2', kind: 'not_today', day: 'Thu', date: '2026-10-22' },
    ]);
    expect(input.today).toBe('2026-10-22');
  });

  it('stays under the server body limit (64 KB) with every source on', () => {
    const all: LifelogSource[] = ['note', 'saved_link', 'calendar', 'sms', 'messenger', 'document', 'photo'];
    const input = toThinkInput(flowState({ sample: true, sources: all }), persona, scenario);
    expect(new TextEncoder().encode(JSON.stringify(input)).length).toBeLessThan(64 * 1024);
  });
});
