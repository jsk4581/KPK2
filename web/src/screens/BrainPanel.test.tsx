import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as logic from '@app/logic.js';
import persona from '@app/data/persona-dana.json';
import { resetScenarioCache, type ThinkOutput } from '../api/brain';
import thinkOut from '../brain/__fixtures__/think-out.json';
import scenario from '../brain/__fixtures__/scenario.json';
import { StoreProvider, createInitialState } from '../state/store';
import type { AppState, Week } from '../state/types';
import BrainPanel from './BrainPanel';
import Progress from './Progress';

const data = thinkOut as unknown as ThinkOutput;

describe('BrainPanel', () => {
  it('renders the brain state from a /v1/think answer', () => {
    render(<BrainPanel view={{ status: 'ok', data }} />);
    expect(screen.getByText('Decision brain: rules, no AI')).toBeInTheDocument();
    expect(screen.getByText('[SIMULATION] synthetic history')).toBeInTheDocument();
    expect(screen.getByTestId('brain-energy')).toHaveTextContent('Good');
    expect(screen.getByTestId('brain-momentum')).toHaveTextContent('Strong');
    expect(screen.getByTestId('brain-efficacy')).toHaveTextContent('Solid');
    expect(screen.getByTestId('brain-risk')).toHaveTextContent('Low');
    expect(screen.getByTestId('brain-risk')).not.toHaveClass('brain-attention');
    expect(screen.getByTestId('brain-milestone')).toHaveTextContent('M1 Fit');
    expect(screen.getByTestId('brain-milestone')).toHaveTextContent('2026-10-19');
    expect(screen.getByTestId('brain-milestone')).toHaveTextContent('First evidence that this path fits you');
    const constraint = screen.getByTestId('brain-constraint');
    expect(constraint).toHaveTextContent('Time');
    expect(constraint).toHaveTextContent('3 of 5 recent Not today reasons point to time (weighted score 0.65).');
    const step = screen.getByTestId('brain-intervention');
    expect(step).toHaveTextContent('List seven discovery questions');
    expect(step).toHaveTextContent('20 min');
    expect(screen.getByTestId('brain-drift')).toHaveTextContent('Write a before/after page moved 2 times this week');
    expect(screen.queryByTestId('brain-offline')).not.toBeInTheDocument();
  });

  it('says Not enough data instead of showing the brain starting values (no data yet)', () => {
    // A Start user with nothing on record: the brain answers its starting constants.
    const empty = {
      ...data,
      state: {
        energy: null,
        momentum: 0.5,
        selfEfficacy: 0.5,
        today: null,
        arcStart: null,
        features: [],
        risk: { level: 'green', reasons: [], points: 0 },
      },
    };
    render(<BrainPanel view={{ status: 'ok', data: empty }} />);
    expect(screen.getByTestId('brain-energy')).toHaveTextContent('Not reported');
    expect(screen.getByTestId('brain-momentum')).toHaveTextContent('Not enough data');
    expect(screen.getByTestId('brain-efficacy')).toHaveTextContent('Not enough data');
    expect(screen.getByTestId('brain-risk')).toHaveTextContent('Not enough data');
    expect(screen.getByTestId('brain-risk')).not.toHaveTextContent('Low');
    expect(screen.getByTestId('brain-momentum')).not.toHaveTextContent('Building');
    expect(screen.getByTestId('brain-efficacy')).not.toHaveTextContent('Growing');
  });

  it('waits for enough days before naming momentum and self-efficacy', () => {
    const oneDay = {
      ...data,
      state: {
        ...data.state,
        momentum: 0.65,
        selfEfficacy: 0.4,
        features: [{ date: '2026-10-22', logged: true, done: 1, notToday: 1 }],
        risk: { level: 'green', reasons: ['first_week'], points: 1 },
      },
    };
    render(<BrainPanel view={{ status: 'ok', data: oneDay }} />);
    expect(screen.getByTestId('brain-momentum')).toHaveTextContent('Not enough data (1 of 3 days so far)');
    expect(screen.getByTestId('brain-efficacy')).toHaveTextContent('Not enough data (1 of 3 days so far)');
    // The risk rules read real counts, so the level shows once there is a day of data.
    expect(screen.getByTestId('brain-risk')).toHaveTextContent('Low');
  });

  it('shows elevated risk with its reasons in the attention style', () => {
    const amber = {
      ...data,
      state: { ...data.state, risk: { ...data.state.risk, level: 'amber', reasons: ['consec_rest', 'low_condition'] } },
    };
    render(<BrainPanel view={{ status: 'ok', data: amber }} />);
    const risk = screen.getByTestId('brain-risk');
    expect(risk).toHaveTextContent('Medium');
    expect(risk).toHaveClass('brain-attention');
    const reasons = within(screen.getByTestId('brain-risk-reasons')).getAllByRole('listitem');
    expect(reasons.map((r) => r.textContent)).toEqual([
      'Two or more Not today in a row',
      'Energy has been low the last 3 days',
    ]);
  });

  it('lists drift about this week only, not about the synthetic history actions', () => {
    const mixed = {
      ...data,
      monitor: {
        ...data.monitor,
        drift: [
          { type: 'repeated_move', actionId: 'scenario-a1', note: 'scenario-a1 moved 2 times this week' },
          { type: 'overload', note: '2 steps land on Fri' },
        ],
      },
    };
    render(<BrainPanel view={{ status: 'ok', data: mixed }} />);
    const drift = screen.getByTestId('brain-drift');
    expect(drift).toHaveTextContent('2 steps land on Fri');
    expect(drift).not.toHaveTextContent('scenario-a1');
  });

  it('shows a quiet skeleton while loading', () => {
    render(<BrainPanel view={{ status: 'loading' }} />);
    expect(screen.getByTestId('brain-loading')).toBeInTheDocument();
    expect(screen.getByTestId('brain-panel')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows one small line when the brain is offline', () => {
    render(<BrainPanel view={{ status: 'offline', reason: 'network' }} />);
    expect(screen.getByTestId('brain-offline')).toHaveTextContent('Brain offline: showing on-device signals');
    expect(screen.queryByTestId('brain-panel')).not.toBeInTheDocument();
  });
});

function sampleState(): AppState {
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

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('Progress with the decision brain', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BRAIN_URL', 'https://brain.example.test');
    resetScenarioCache();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('calls think on open and appends the brain steps to Why, labelled Brain', async () => {
    const fetchMock = vi.fn(async (url: string) => jsonResponse(url.endsWith('/v1/scenario') ? scenario : thinkOut));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <StoreProvider initialState={sampleState()}>
        <Progress />
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('brain-energy')).toHaveTextContent('Good'));
    const urls = fetchMock.mock.calls.map((c) => c[0]);
    expect(urls).toContain('https://brain.example.test/v1/scenario');
    expect(urls).toContain('https://brain.example.test/v1/think');
    // The on-device signals stay on screen.
    expect(screen.getByTestId('signal-momentum')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Why?' }));
    const steps = within(screen.getByTestId('why-steps')).getAllByRole('listitem');
    const fns = steps.map((s) => within(s).getByTestId('step-fn').textContent);
    expect(fns).toEqual(['buildWeek', 'progressSignals', ...data.trace.map((t) => t.fn), 'explain']);
    const brainPart = steps.slice(2);
    brainPart.forEach((s) => expect(s).toHaveTextContent('Brain'));
    expect(brainPart[0]).toHaveTextContent(data.trace[0].output);
    const explainStep = brainPart[brainPart.length - 1];
    expect(explainStep).toHaveTextContent('decision full a3 (20 min)');
    expect(explainStep).toHaveTextContent('policy:overdue');
    expect(explainStep).toHaveTextContent('lifelog l33 (2026-10-18): condition 4/5');
  });

  it('keeps the local signals and adds no brain steps when the brain is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    render(
      <StoreProvider initialState={sampleState()}>
        <Progress />
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('brain-offline')).toBeInTheDocument());
    expect(screen.getByTestId('signal-momentum')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Why?' }));
    const fns = within(screen.getByTestId('why-steps'))
      .getAllByRole('listitem')
      .map((s) => within(s).getByTestId('step-fn').textContent);
    expect(fns).toEqual(['buildWeek', 'progressSignals']);
  });

  it('shows the offline line when VITE_BRAIN_URL is not set', async () => {
    vi.stubEnv('VITE_BRAIN_URL', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(
      <StoreProvider initialState={sampleState()}>
        <Progress />
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('brain-offline')).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
