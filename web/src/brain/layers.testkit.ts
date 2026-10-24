import * as logic from '@app/logic.js';
import persona from '@app/data/persona-dana.json';
import type { BrainScenario, ThinkInput, ThinkOutput } from '../api/brain';
import { createInitialState } from '../state/store';
import type { AppState, Week } from '../state/types';
import scenarioJson from './__fixtures__/scenario.json';
import { toThinkInput } from './adapter';

// Fixture for the four-layer Why panel: one real brain pass. The repo's brain code
// (../brain/index.js, what the brain server runs) is imported in process and fed the sample
// persona state plus the synthetic scenario, the way useBrain would send it, so trace_layers
// and labels are exactly what the server returns (only the ms timings differ run to run).
// Node test environment only (jsdom tests read the saved copy, __fixtures__/think-layers.json,
// which layers.test.ts keeps equal to a fresh run; UPDATE_LAYER_FIXTURE=1 rewrites it).
// The import path is built at run time so the type checker does not pull the server code in.
const here = import.meta.url;
const brainUrl = new URL('../../../brain/index.js', here).href;
export const LAYER_FIXTURE_URL = new URL('./__fixtures__/think-layers.json', here);

export function sampleState(): AppState {
  const week = logic.buildWeek(persona.fallback.paths[0], persona.today) as unknown as Week;
  return {
    ...createInitialState(),
    screen: 'progress',
    lifelogConnected: true,
    chosenPathId: persona.fallback.paths[0].role_id,
    week,
    trace: [{ fn: 'buildWeek', input: 'draft', output: '3 actions', via: 'logic' }],
  };
}

export async function realThinkOut(): Promise<ThinkOutput> {
  const brain = (await import(/* @vite-ignore */ brainUrl)) as { think: (input: ThinkInput) => ThinkOutput };
  const input = toThinkInput(sampleState(), persona, scenarioJson as unknown as BrainScenario);
  // Through JSON, as the browser receives it.
  return JSON.parse(JSON.stringify(brain.think(input))) as ThinkOutput;
}
