import { useEffect, useRef, useState } from 'react';
import persona from '@app/data/persona-dana.json';
import { getScenario, think, type BrainFailure, type ThinkOutput } from '../api/brain';
import type { AppState, TraceEntry } from '../state/types';
import { isSampleUser, sendsSyntheticHistory, toThinkInput } from './adapter';
import { groupLayers, type LayerGroup } from './layers';

export type BrainView =
  | { status: 'loading' }
  // synthetic: the input carried synthetic history (sample persona), so the panel labels it.
  // backup: the backup address answered this call, so the Why trace says "Brain (backup)".
  | { status: 'ok'; data: ThinkOutput; synthetic: boolean; backup?: boolean }
  | { status: 'offline'; reason: BrainFailure };

// Calls the brain when the screen opens and again after every new check-in while it stays
// mounted. Sample persona users also get the check-ins of earlier weeks from the server's
// synthetic history (fetched once); if that fetch fails only our own lifelog and this week's
// check-ins are sent.
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
      setView(
        result.ok
          ? { status: 'ok', data: result.data, synthetic: sendsSyntheticHistory(input), backup: result.served === 'backup' }
          : { status: 'offline', reason: result.reason },
      );
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
  const via = view.backup ? 'brain_backup' : 'brain';
  const steps: TraceEntry[] = trace.map((t) => ({ fn: t.fn, input: t.input, output: t.output, via }));
  const evidence = explain.evidence.map((e) =>
    clip(`${[e.type, e.id].filter(Boolean).join(' ')}${e.date ? ` (${e.date})` : ''}${e.note ? `: ${e.note}` : ''}`),
  );
  steps.push({
    fn: 'explain',
    input: `decision ${intervention.kind}${intervention.actionId ? ` ${intervention.actionId}` : ''} (${intervention.minutes} min)`,
    output: `rules: ${explain.rules.join(', ') || 'none'}; evidence: ${evidence.join('; ') || 'none'}`,
    via,
  });
  return steps;
}

// The brain's four-layer story for the Why panel, only from a successful call that carried a
// well-formed trace_layers. Null otherwise, and the panel shows brainSteps() as before.
export function brainLayers(view: BrainView): { groups: LayerGroup[]; backup: boolean } | null {
  if (view.status !== 'ok' || !view.data.trace_layers) return null;
  const groups = groupLayers(view.data.trace_layers, view.data.labels);
  return groups.length > 0 ? { groups, backup: view.backup === true } : null;
}
