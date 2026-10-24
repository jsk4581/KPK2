// @vitest-environment node
import { describe, expect, it } from 'vitest';
import * as logic from '@app/logic.js';
import persona from '@app/data/persona-dana.json';
import type { BrainScenario, ThinkInput, ThinkOutput } from '../api/brain';
import { createInitialState, reducer } from '../state/store';
import type { AppState, Day, RankedRole, Week } from '../state/types';
import scenarioJson from './__fixtures__/scenario.json';
import { toThinkInput } from './adapter';

// Runs the adapter output through the real brain (../brain/index.js, the code the brain
// server runs) in process, the way the screens would after the same taps. The import path is
// built at run time so the type checker does not pull the server code into the web build.
const brainUrl = new URL('../../../brain/index.js', import.meta.url).href;
const brain = (await import(/* @vite-ignore */ brainUrl)) as { think: (input: ThinkInput) => ThinkOutput };

const scenario = scenarioJson as unknown as BrainScenario;
const draft = persona.fallback.paths[0];
const ROLE: RankedRole = { id: draft.role_id, title: 'Messaging Consultant', ratio: 0.5, transfers: ['x'], missing: ['y'] };
const DEMO_TODAY = persona.today as Day;

type Result = { ok: boolean; week: Week };

// The same steps the Week screen runs: logic.applyCheckin on the demo today, then the record.
function tap(state: AppState, actionId: string, kind: 'done' | 'not_today'): AppState {
  const result = logic.applyCheckin(state.week, actionId, kind, DEMO_TODAY) as Result;
  expect(result.ok).toBe(true);
  let next = reducer(state, { type: 'setWeek', week: result.week });
  next = reducer(next, {
    type: 'addCheckin',
    record: { actionId, kind, day: DEMO_TODAY, message: '', adjustment: null, shareCard: null, comeback: null },
  });
  return next;
}

function freshState(sample: boolean): AppState {
  let state = createInitialState();
  if (sample) state = reducer(state, { type: 'connectLifelog' });
  state = reducer(state, { type: 'setRankedRoles', roles: [ROLE] });
  state = reducer(state, { type: 'setPaths', paths: { source: 'fallback', paths: [draft as never] } });
  const week = logic.buildWeek(draft, DEMO_TODAY) as unknown as Week;
  return reducer(state, { type: 'choosePath', pathId: draft.role_id, week });
}

describe('brain and Week screen agree on today', () => {
  it('reasons on the Week screen demo today', () => {
    const out = brain.think(toThinkInput(freshState(true), persona, scenario));
    expect(out.context?.todayWeekday).toBe(DEMO_TODAY);
  });

  it('suggests the action the Week screen has for today, not a future one as overdue', () => {
    const state = freshState(true);
    const dueToday = state.week!.actions.find((a) => a.day === DEMO_TODAY)!;
    const out = brain.think(toThinkInput(state, persona, scenario));
    expect(out.intervention.actionId).toBe(dueToday.id);
    expect(out.intervention.reasons).not.toContain('overdue');
  });

  it('never calls an action just moved to tomorrow overdue', () => {
    let state = freshState(true);
    state = tap(state, 'a1', 'done');
    state = tap(state, 'a2', 'not_today');
    const moved = state.week!.actions.find((a) => a.id === 'a2')!;
    expect(logic.WEEK_DAYS.indexOf(moved.day)).toBeGreaterThan(logic.WEEK_DAYS.indexOf(DEMO_TODAY));
    const out = brain.think(toThinkInput(state, persona, scenario));
    expect(out.intervention.reasons).not.toContain('moved_overdue');
    expect(out.intervention.reasons).not.toContain('overdue');
    expect(out.intervention.actionId).not.toBe('a2');
  });
});
