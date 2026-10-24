import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as logic from '@app/logic.js';
import persona from '@app/data/persona-dana.json';
import { StoreProvider, createInitialState } from '../state/store';
import type { AppState, CheckinRecord, TraceEntry, Week } from '../state/types';
import Progress, { connectedLifelog } from './Progress';
import progressCss from './Progress.css?raw';

const TODAY = persona.today;

// Run the real judgment calls the other screens make, in order, collecting their traces.
function runFlow(kinds: Array<['a1' | 'a2' | 'a3', 'done' | 'not_today']>, opts: { lifelog: boolean; via: 'llm' | 'fallback' }) {
  const trace: TraceEntry[] = [];
  const enabledSources = ['note', 'saved_link', 'calendar'];
  if (opts.lifelog) {
    const summarize = logic.withTrace('summarizeLifelog', logic.summarizeLifelog);
    trace.push(summarize(persona.lifelog, enabledSources).trace as TraceEntry);
  }
  const draft = persona.fallback.paths[0];
  trace.push({ fn: 'POST /api/paths', input: '3 roles', output: '3 paths', via: opts.via });
  const build = logic.withTrace('buildWeek', logic.buildWeek);
  const built = build(draft, TODAY);
  trace.push(built.trace as TraceEntry);
  let week = built.result as unknown as Week;
  const checkins: CheckinRecord[] = [];
  const checkin = logic.withTrace('applyCheckin', logic.applyCheckin);
  for (const [id, kind] of kinds) {
    const step = checkin(week, id, kind, TODAY);
    trace.push(step.trace as TraceEntry);
    week = step.result.week as unknown as Week;
    checkins.push({
      actionId: id,
      kind,
      day: TODAY as CheckinRecord['day'],
      message: step.result.message,
      adjustment: step.result.adjustment,
      shareCard: step.result.shareCard,
      comeback: step.result.comeback,
    });
  }
  const state: AppState = {
    ...createInitialState(),
    screen: 'progress',
    lifelogConnected: opts.lifelog,
    week,
    checkins,
    trace,
  };
  return state;
}

function renderProgress(state: AppState) {
  return render(
    <StoreProvider initialState={state}>
      <Progress />
    </StoreProvider>,
  );
}

describe('Progress tab', () => {
  it('shows progress signals after a few check-ins, computed by logic.progressSignals', () => {
    const state = runFlow(
      [
        ['a1', 'done'],
        ['a2', 'not_today'],
        ['a2', 'done'],
      ],
      { lifelog: true, via: 'fallback' },
    );
    const expected = logic.progressSignals(state.checkins, connectedLifelog(state));
    renderProgress(state);

    const momentum = screen.getByTestId('signal-momentum');
    expect(momentum).toHaveTextContent(new RegExp(expected.momentum, 'i'));
    expect(momentum).toHaveTextContent(String(expected.momentumScore));
    expect(screen.getByTestId('signal-risk')).toHaveTextContent(new RegExp(expected.dropoutRisk, 'i'));
    expect(screen.getByTestId('signal-days')).toHaveTextContent(String(expected.daysShownUp));
    expect(screen.getByText(/not a streak/i)).toBeInTheDocument();

    const evidence = within(screen.getByTestId('evidence-list')).getAllByRole('listitem');
    expect(evidence).toHaveLength(expected.evidence.length);
    // Check-ins name the action they were about.
    expect(evidence[0]).toHaveTextContent(state.week!.actions[0].title);
    expect(screen.getByText('[SIMULATION] Sample persona: synthetic')).toBeInTheDocument();
  });

  it('Why? lists the processing steps in the same order and count as the calls that ran', () => {
    const state = runFlow(
      [
        ['a1', 'not_today'],
        ['a1', 'done'],
      ],
      { lifelog: true, via: 'llm' },
    );
    renderProgress(state);
    expect(screen.queryByTestId('why-panel')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Why?' }));

    const steps = within(screen.getByTestId('why-steps')).getAllByRole('listitem');
    // Every recorded call plus the progressSignals call that produced this screen.
    const expectedFns = [...state.trace.map((t) => t.fn), 'progressSignals'];
    expect(steps).toHaveLength(expectedFns.length);
    steps.forEach((step, i) => {
      expect(within(step).getByTestId('step-fn')).toHaveTextContent(expectedFns[i]);
    });
    expect(steps[1]).toHaveTextContent('AI-drafted');
    expect(steps[0]).toHaveTextContent('Rule');
    expect(steps[0]).not.toHaveTextContent('logic.js');
    // Inputs and outputs are the recorded summaries, not invented text.
    expect(steps[2]).toHaveTextContent(state.trace[2].output);

    // Evidence items are shown in the Why panel too.
    const why = screen.getByTestId('why-panel');
    expect(within(why).getByText('How we got this')).toBeInTheDocument();
    expect(within(why).getByText(logic.PROGRESS_RULES.daysShownUp)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide why' }));
    expect(screen.queryByTestId('why-panel')).not.toBeInTheDocument();
  });

  it('labels a fallback step as sample output', () => {
    const state = runFlow([['a1', 'done']], { lifelog: false, via: 'fallback' });
    renderProgress(state);
    fireEvent.click(screen.getByRole('button', { name: 'Why?' }));
    const steps = within(screen.getByTestId('why-steps')).getAllByRole('listitem');
    expect(steps[0]).toHaveTextContent('Sample result');
  });

  it('does not count lifelog that was never connected', () => {
    const state = runFlow([['a1', 'done']], { lifelog: false, via: 'fallback' });
    expect(connectedLifelog(state)).toEqual([]);
    renderProgress(state);
    const evidence = within(screen.getByTestId('evidence-list')).getAllByRole('listitem');
    expect(evidence).toHaveLength(1);
    expect(screen.queryByText('[SIMULATION] Sample persona: synthetic')).not.toBeInTheDocument();
  });

  it('counts only enabled sources of the connected lifelog', () => {
    const state = runFlow([], { lifelog: true, via: 'fallback' });
    const items = connectedLifelog(state);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => state.enabledSources.includes(i.source as never))).toBe(true);
  });

  it('shows a calm empty state with no check-ins and only one Why step', () => {
    renderProgress({ ...createInitialState(), screen: 'progress' });
    expect(screen.getByText(/No check-ins yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Why?' }));
    const steps = within(screen.getByTestId('why-steps')).getAllByRole('listitem');
    expect(steps).toHaveLength(1);
    expect(within(steps[0]).getByTestId('step-fn')).toHaveTextContent('progressSignals');
  });

  it('goes back to this week', () => {
    const state = runFlow([], { lifelog: false, via: 'fallback' });
    renderProgress(state);
    expect(screen.getByRole('button', { name: 'Back to this week' })).toBeInTheDocument();
  });

  it('uses no failure wording and no red warning colors', () => {
    const state = runFlow(
      [
        ['a1', 'not_today'],
        ['a2', 'not_today'],
      ],
      { lifelog: true, via: 'fallback' },
    );
    const { container } = renderProgress(state);
    fireEvent.click(screen.getByRole('button', { name: 'Why?' }));
    // "not a missed day" is the allowed rest-day line; trace summaries may clip it.
    const text = (container.textContent ?? '').replace(/not a missed da(y|\.\.\.)/gi, '');
    expect(text).not.toMatch(/failed|missed/i);
    expect(progressCss).not.toMatch(/\bred\b|#f00\b|#ff0000|#d32f2f|#e53935|#dc2626|#ef4444|crimson/i);
  });
});
