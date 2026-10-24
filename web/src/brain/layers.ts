import type { BrainLabels, BrainLayer, BrainLayerStep } from '../api/brain';

// The brain's four-layer story (trace_layers) as the Why panel shows it: grouped by layer in
// L1..L4 order, with the internal names in the summaries turned into the server's labels.
// Nothing is added that the server did not send.

export const LAYER_ORDER: readonly BrainLayer[] = ['L1', 'L2', 'L3', 'L4'];

export const LAYER_NAME: Record<BrainLayer, string> = {
  L1: 'Collect',
  L2: 'Organize',
  L3: 'Decide',
  L4: 'Watch',
};

export const DESIGNED_BADGE = 'Design, not running today';

export interface LayerStepView {
  stage: string;
  label: string;
  status: 'ran' | 'designed';
  input: string;
  output: string;
  ms: number | null;
}

export interface LayerGroup {
  layer: BrainLayer;
  name: string;
  steps: LayerStepView[];
}

// The label for an internal enum value, or null when the server has none (never a guess).
export function valueLabel(labels: BrainLabels | null | undefined, path: string, value: string): string | null {
  const map = labels?.values[path];
  return map && Object.hasOwn(map, value) ? map[value] : null;
}

// "<word> <id>" spots in the summaries where the id is an internal enum value.
const AFTER_WORD: ReadonlyArray<[RegExp, string]> = [
  [/\b(risk) ([a-z][\w-]*)/g, 'state.risk.level'],
  [/\b(constraint) ([a-z][\w-]*)/g, 'constraint.constraint'],
  [/\b(decision) ([a-z][\w-]*)/g, 'intervention.kind'],
  [/\b(stage) ([a-z][\w-]*)/g, 'readiness.level'],
];

// Stages whose output starts with the value itself.
const LEADING: Record<string, string> = {
  constraint: 'constraint.constraint',
  policy: 'intervention.kind',
  goal: 'goal.state',
};

const GATE_ID = /\b(M\d+)\b/g;

// Internal names in one summary line -> the server's user-facing labels. Text without a known
// value is returned unchanged.
export function labelSummary(text: string, stage: string, labels: BrainLabels | null | undefined): string {
  if (!labels || text === '') return text;
  let out = text;
  const lead = LEADING[stage];
  if (lead) {
    out = out.replace(/^([a-z][\w-]*)/, (word) => valueLabel(labels, lead, word) ?? word);
  }
  for (const [pattern, path] of AFTER_WORD) {
    out = out.replace(pattern, (whole, word: string, value: string) => {
      const label = valueLabel(labels, path, value);
      return label ? `${word} ${label}` : whole;
    });
  }
  return out.replace(GATE_ID, (id: string) => {
    const name = valueLabel(labels, 'goal.milestones.id', id);
    return name ? `${id} (${name})` : id;
  });
}

// The badge already says "Design, not running today", so a designed step's output drops that
// lead-in and keeps the reason.
function designedOutput(text: string): string {
  const rest = text.replace(/^Design, not running today[:.]?\s*/i, '');
  return rest.length > 0 ? rest[0].toUpperCase() + rest.slice(1) : rest;
}

export function groupLayers(steps: BrainLayerStep[], labels?: BrainLabels | null): LayerGroup[] {
  return LAYER_ORDER.map((layer) => ({
    layer,
    name: labels?.layers?.[layer] ?? LAYER_NAME[layer],
    steps: steps
      .filter((s) => s.layer === layer)
      .map((s) => ({
        stage: s.stage,
        label: s.label,
        status: s.status,
        input: labelSummary(s.input_summary, s.stage, labels),
        output: s.status === 'designed' ? designedOutput(s.output_summary) : labelSummary(s.output_summary, s.stage, labels),
        ms: s.status === 'ran' ? s.ms : null,
      })),
  })).filter((g) => g.steps.length > 0);
}

// "Ran · 4.03 ms" badge text for a step that ran.
export function ranBadge(ms: number | null): string {
  return ms === null ? 'Ran' : `Ran · ${ms} ms`;
}
