// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readLabels, readTraceLayers, resetBrainPreference, think, type ThinkOutput } from '../api/brain';
import { DESIGNED_BADGE, LAYER_ORDER, groupLayers, labelSummary, ranBadge } from './layers';
import saved from './__fixtures__/think-layers.json';
import { LAYER_FIXTURE_URL, realThinkOut } from './layers.testkit';

// One real brain pass (repo brain/index.js in process), so trace_layers and labels are real.
const out = await realThinkOut();

// The ms timings are the only part that changes run to run.
const withoutMs = (data: unknown) => {
  const copy = JSON.parse(JSON.stringify(data)) as ThinkOutput;
  copy.trace_layers = copy.trace_layers?.map((s) => ({ ...s, ms: typeof s.ms === 'number' ? 0 : s.ms }));
  return copy;
};

// Some brain sentences use U+2014; the saved copy writes it as a hyphen (repo text style).
// None of those sentences is read by the layer view.
const LONG_DASH = String.fromCharCode(0x2014);
const savedForm = (data: unknown): string => `${JSON.stringify(data, null, 2).split(LONG_DASH).join('-')}\n`;

if (import.meta.env.UPDATE_LAYER_FIXTURE) {
  const fs = (await import(/* @vite-ignore */ 'node:fs')) as { writeFileSync: (path: URL, text: string) => void };
  fs.writeFileSync(LAYER_FIXTURE_URL, savedForm(out));
}

describe('saved fixture', () => {
  it.skipIf(Boolean(import.meta.env.UPDATE_LAYER_FIXTURE))(
    'is what the brain returns today (rerun with UPDATE_LAYER_FIXTURE=1 to refresh it)',
    () => {
      expect(withoutMs(saved)).toEqual(withoutMs(JSON.parse(savedForm(out))));
    },
  );
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('the real brain answer carries the four-layer story', () => {
  it('has well-formed trace_layers and labels', () => {
    expect(readTraceLayers(out.trace_layers)).toEqual(out.trace_layers);
    expect(out.trace_layers!.map((s) => s.status)).toContain('designed');
    expect(readLabels(out.labels)?.values['constraint.constraint']['opportunity-time']).toBe('Time');
  });
});

describe('groupLayers', () => {
  it('groups by layer in L1..L4 order, keeping the server order inside a layer', () => {
    const groups = groupLayers(out.trace_layers!, out.labels);
    expect(groups.map((g) => g.layer)).toEqual(LAYER_ORDER);
    expect(groups.map((g) => g.name)).toEqual(['Collect', 'Organize', 'Decide', 'Watch']);
    for (const g of groups) {
      const sent = out.trace_layers!.filter((s) => s.layer === g.layer).map((s) => s.label);
      expect(g.steps.map((s) => s.label)).toEqual(sent);
    }
  });

  it('groups out-of-order steps and skips empty layers', () => {
    const steps = [
      { layer: 'L4', stage: 'x', label: 'four', status: 'ran', input_summary: '', output_summary: '', ms: 1 },
      { layer: 'L1', stage: 'y', label: 'one', status: 'ran', input_summary: '', output_summary: '', ms: 2 },
    ] as const;
    const groups = groupLayers([...steps], null);
    expect(groups.map((g) => g.layer)).toEqual(['L1', 'L4']);
  });

  it('uses the server layer names when labels carry them', () => {
    const groups = groupLayers(out.trace_layers!, { ...out.labels!, layers: { L2: 'Graph' } });
    expect(groups.map((g) => g.name)).toEqual(['Collect', 'Graph', 'Decide', 'Watch']);
  });

  it('keeps ms only for steps that ran and drops the repeated lead-in from designed steps', () => {
    const steps = groupLayers(out.trace_layers!, out.labels).flatMap((g) => g.steps);
    const designed = steps.filter((s) => s.status === 'designed');
    expect(designed.length).toBeGreaterThan(0);
    designed.forEach((s) => {
      expect(s.ms).toBeNull();
      expect(s.output).not.toMatch(/^Design, not running today/);
    });
    steps.filter((s) => s.status === 'ran').forEach((s) => expect(typeof s.ms).toBe('number'));
    expect(DESIGNED_BADGE).toBe('Design, not running today');
    expect(ranBadge(4.03)).toBe('Ran · 4.03 ms');
    expect(ranBadge(null)).toBe('Ran');
  });
});

describe('labelSummary', () => {
  it('turns internal ids into the server labels', () => {
    const labels = out.labels!;
    expect(labelSummary('opportunity-time · 3 evidence ids · rule argmax', 'constraint', labels)).toBe(
      'Time · 3 evidence ids · rule argmax',
    );
    expect(labelSummary('risk amber · constraint capability · gate none', 'policy', labels)).toBe(
      'risk Medium · constraint Skills · gate none',
    );
    expect(labelSummary('shrink a2 (10 min) → SHRINK', 'policy', labels)).toBe('Smaller step a2 (10 min) → SHRINK');
    expect(labelSummary('provisional · gates passed: M1, M2 · version 1', 'goal', labels)).toBe(
      'Path chosen · gates passed: M1 (Fit check), M2 (First proof) · version 1',
    );
    expect(labelSummary('6 entries → 65/100 · stage build-proof · next gate M3', 'readiness', labels)).toBe(
      '6 entries → 65/100 · stage Build proof · next gate M3 (Market contact)',
    );
  });

  it('leaves unknown values and text without labels unchanged', () => {
    expect(labelSummary('archetype unknown · stage contemplation', 'person', out.labels)).toBe(
      'archetype unknown · stage contemplation',
    );
    expect(labelSummary('risk amber', 'state', null)).toBe('risk amber');
  });
});

describe('think() with optional trace_layers and labels', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BRAIN_URL', 'https://brain.example.test');
    vi.stubEnv('VITE_BRAIN_URL_BACKUP', '');
    resetBrainPreference();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  async function answer(body: unknown) {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(body)));
    const result = await think({});
    expect(result.ok).toBe(true);
    return result.ok ? result.data : null;
  }

  it('keeps them when well formed', async () => {
    const data = await answer(out);
    expect(data?.trace_layers).toEqual(out.trace_layers);
    expect(data?.labels?.values['intervention.kind'].shrink).toBe('Smaller step');
  });

  it('still answers when they are missing', async () => {
    const { trace_layers: _l, labels: _b, ...old } = out;
    const data = await answer(old);
    expect(data?.trace_layers).toBeUndefined();
    expect(data?.labels).toBeUndefined();
  });

  it('drops malformed ones instead of failing the call', async () => {
    const bad = [
      'not an array',
      [],
      [{ layer: 'L9', label: 'x', status: 'ran' }],
      [{ layer: 'L1', label: 'x', status: 'running' }],
      [{ layer: 'L1', label: 'x', status: 'ran', ms: 'fast' }],
      [{ layer: 'L1', label: 'x', status: 'ran', input_summary: 3 }],
      [...out.trace_layers!, null],
    ];
    for (const trace_layers of bad) {
      const data = await answer({ ...out, trace_layers, labels: 'nope' });
      expect(data?.trace_layers).toBeUndefined();
      expect(data?.labels).toBeUndefined();
      expect(data?.trace.length).toBe(out.trace.length);
    }
  });

  it('keeps only the string entries of labels', async () => {
    const data = await answer({
      ...out,
      labels: { fields: { a: 'A', b: 2 }, values: { k: { x: 'X', y: null }, bad: 'no' }, layers: { L1: 'In', L7: 'No' } },
    });
    expect(data?.labels).toEqual({ fields: { a: 'A' }, values: { k: { x: 'X' } }, layers: { L1: 'In' } });
  });
});
