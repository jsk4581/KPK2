import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetBrainPreference, resetScenarioCache, type ThinkOutput } from '../api/brain';
import scenario from '../brain/__fixtures__/scenario.json';
import thinkLayers from '../brain/__fixtures__/think-layers.json';
import { sampleState } from '../brain/layers.testkit';
import { StoreProvider } from '../state/store';
import Progress from './Progress';

// The Why panel with a real brain answer: the saved output of one in-process run of the repo's
// brain/index.js (layers.testkit.ts; layers.test.ts keeps it equal to a fresh run).
const out = thinkLayers as unknown as ThinkOutput;

// U+2014, spelled by code point so this file itself stays free of it.
const LONG_DASH = String.fromCharCode(0x2014);

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function openWhy(answer: unknown) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => jsonResponse(url.endsWith('/v1/scenario') ? scenario : answer)));
  render(
    <StoreProvider initialState={sampleState()}>
      <Progress />
    </StoreProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('brain-energy')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Why?' }));
  return screen.getByTestId('why-panel');
}

const stepFns = () =>
  within(screen.getByTestId('why-steps'))
    .getAllByRole('listitem')
    .map((s) => within(s).getByTestId('step-fn').textContent);

describe('Why panel: the brain as four layers', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BRAIN_URL', 'https://brain.example.test');
    vi.stubEnv('VITE_BRAIN_URL_BACKUP', '');
    resetScenarioCache();
    resetBrainPreference();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('keeps the app steps on top, then groups the brain steps by layer in order', async () => {
    const why = await openWhy(out);
    // The app's own on-device steps stay first, without the fn-level brain steps.
    expect(stepFns()).toEqual(['buildWeek', 'progressSignals']);
    expect(why).toHaveTextContent('Steps tagged Rule or Brain follow fixed rules, not AI.');
    const story = within(why).getByTestId('why-layers');
    expect(story).toHaveTextContent('Fixed rules, not AI.');
    expect(within(story).getByTestId('layers-via')).toHaveTextContent('Brain');
    const heads = within(story)
      .getAllByTestId('layer-head')
      .map((h) => h.textContent?.replace(/\s+/g, ' ').trim());
    expect(heads).toEqual(['L1 Collect', 'L2 Organize', 'L3 Decide', 'L4 Watch']);
    // Every step the server sent, each under its own layer, in the server's order.
    const layers = within(story).getAllByTestId('why-layer');
    for (const layer of layers) {
      const id = layer.getAttribute('data-layer');
      const labels = within(layer)
        .getAllByTestId('layer-label')
        .map((l) => l.textContent);
      expect(labels).toEqual(out.trace_layers!.filter((s) => s.layer === id).map((s) => s.label));
    }
    expect(within(story).getAllByTestId('layer-step')).toHaveLength(out.trace_layers!.length);
  });

  it('marks designed steps "Design, not running today" and shows ms for steps that ran', async () => {
    const why = await openWhy(out);
    const steps = within(why).getAllByTestId('layer-step');
    const designed = steps.filter((s) => s.getAttribute('data-status') === 'designed');
    const ran = steps.filter((s) => s.getAttribute('data-status') === 'ran');
    expect(designed.length).toBe(out.trace_layers!.filter((s) => s.status === 'designed').length);
    expect(designed.length).toBeGreaterThan(0);
    designed.forEach((s) => {
      const badge = within(s).getByTestId('layer-status');
      expect(badge).toHaveTextContent(/^Design, not running today$/);
      expect(badge).toHaveClass('progress-tag-designed');
      expect(badge).not.toHaveClass('tag-ok');
      expect(s).not.toHaveTextContent(/\bms\b/);
    });
    const sentRan = out.trace_layers!.filter((t) => t.status === 'ran');
    expect(ran).toHaveLength(sentRan.length);
    ran.forEach((s, i) => {
      expect(within(s).getByTestId('layer-status')).toHaveTextContent(`Ran · ${sentRan[i].ms} ms`);
    });
    // The scrub step says why it is not running, once.
    const scrub = designed[0];
    expect(scrub).toHaveTextContent('Would use: live lifelog stream');
    expect(scrub).toHaveTextContent('Today: The demo lifelog is synthetic and arrives pre-scrubbed.');
  });

  it('turns internal ids into the server labels', async () => {
    const why = await openWhy(out);
    const story = within(why).getByTestId('why-layers');
    const step = (stage: string) =>
      within(story).getAllByTestId('layer-step')[out.trace_layers!.findIndex((s) => s.stage === stage)];
    const constraint = out.constraint.constraint;
    const constraintLabel = out.labels!.values['constraint.constraint'][constraint];
    expect(step('constraint')).toHaveTextContent(`Result: ${constraintLabel} ·`);
    expect(step('policy')).toHaveTextContent(`constraint ${constraintLabel}`);
    expect(step('policy')).toHaveTextContent(`Result: ${out.labels!.values['intervention.kind'][out.intervention.kind]}`);
    expect(step('state')).toHaveTextContent(`risk ${out.labels!.values['state.risk.level'][out.state.risk.level]}`);
    expect(step('readiness')).toHaveTextContent('next gate M1 (Fit check)');
    expect(story).not.toHaveTextContent(constraint);
  });

  it('says Brain (backup) when the backup answered', async () => {
    vi.stubEnv('VITE_BRAIN_URL_BACKUP', 'https://brain-backup.example.test');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.startsWith('https://brain.example.test')
          ? Promise.reject(new TypeError('Failed to fetch'))
          : jsonResponse(url.endsWith('/v1/scenario') ? scenario : out),
      ),
    );
    render(
      <StoreProvider initialState={sampleState()}>
        <Progress />
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('brain-energy')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Why?' }));
    expect(screen.getByTestId('layers-via')).toHaveTextContent('Brain (backup)');
  });

  it('falls back to the fn-level brain steps when trace_layers is missing', async () => {
    const { trace_layers: _layers, ...old } = out as ThinkOutput;
    const why = await openWhy(old);
    expect(within(why).queryByTestId('why-layers')).not.toBeInTheDocument();
    expect(stepFns()).toEqual(['buildWeek', 'progressSignals', ...out.trace.map((t) => t.fn), 'explain']);
  });

  it('falls back to the fn-level brain steps when trace_layers is malformed', async () => {
    const why = await openWhy({ ...out, trace_layers: [{ layer: 'L5', label: 'x', status: 'maybe' }], labels: 7 });
    expect(within(why).queryByTestId('why-layers')).not.toBeInTheDocument();
    expect(stepFns()).toEqual(['buildWeek', 'progressSignals', ...out.trace.map((t) => t.fn), 'explain']);
    // The rest of the answer still renders.
    expect(screen.getByTestId('brain-constraint')).toBeInTheDocument();
  });

  it('names an id the app has no word for with the server label in Where you stand', async () => {
    const labels = { ...out.labels!, values: { ...out.labels!.values, 'constraint.constraint': { mystery: 'Something new' } } };
    await openWhy({ ...out, constraint: { ...out.constraint, constraint: 'mystery' }, labels });
    expect(screen.getByTestId('brain-constraint')).toHaveTextContent('Something new');
    expect(screen.getByTestId('brain-constraint')).not.toHaveTextContent('mystery');
  });

  it('uses no failure words and no long dash in the layer story', async () => {
    const why = await openWhy(out);
    const text = within(why).getByTestId('why-layers').textContent ?? '';
    expect(text.includes(LONG_DASH)).toBe(false);
    expect(text).not.toMatch(/\b(fail|failed|error|broken)\b/i);
  });
});
