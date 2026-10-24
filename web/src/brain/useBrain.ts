import { useEffect, useRef, useState } from 'react';
import persona from '@app/data/persona-dana.json';
import { getScenario, think, type BrainFailure, type ThinkOutput } from '../api/brain';
import type { AppState, TraceEntry } from '../state/types';
import { isSampleUser, toThinkInput } from './adapter';

export type BrainView =
  | { status: 'loading' }
  | { status: 'ok'; data: ThinkOutput }
  | { status: 'offline'; reason: BrainFailure };

// Calls the brain when the screen opens and again after every new check-in while it stays
// mounted. Sample persona users get the server's synthetic history (fetched once); if that
// fetch fails only our own lifelog is sent.
export function useBrain(state: AppState): BrainView {
  const [view, setView] = useState<BrainView>({ status: 'loading' });
  const latest = useRef(state);
  latest.current = state;
  const checkinCount = state.checkins.length;

  useEffect(() => {
    let alive = true;
    setView({ status: 'loading' });
    void (async () => {
      const current = latest.current;
      const scenario = isSampleUser(current) ? await getScenario() : null;
      const input = toThinkInput(current, persona, scenario && scenario.ok ? scenario.data : null);
      const result = await think(input);
      if (!alive) return;
      setView(result.ok ? { status: 'ok', data: result.data } : { status: 'offline', reason: result.reason });
    })();
    return () => {
      alive = false;
    };
  }, [checkinCount]);

  return view;
}

function clip(text: string, max = 160): string {
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

// The brain's own steps for the Why panel, only from a successful call: every trace entry
// the server recorded, in order, then the explain step (the decision it explained and the
// rules and evidence it returned). Nothing is added that the server did not return.
export function brainSteps(view: BrainView): TraceEntry[] {
  if (view.status !== 'ok') return [];
  const { trace, explain, intervention } = view.data;
  const steps: TraceEntry[] = trace.map((t) => ({ fn: t.fn, input: t.input, output: t.output, via: 'brain' }));
  const evidence = explain.evidence.map((e) =>
    clip(`${[e.type, e.id].filter(Boolean).join(' ')}${e.date ? ` (${e.date})` : ''}${e.note ? `: ${e.note}` : ''}`),
  );
  steps.push({
    fn: 'explain',
    input: `decision ${intervention.kind}${intervention.actionId ? ` ${intervention.actionId}` : ''} (${intervention.minutes} min)`,
    output: `rules: ${explain.rules.join(', ') || 'none'}; evidence: ${evidence.join('; ') || 'none'}`,
    via: 'brain',
  });
  return steps;
}
