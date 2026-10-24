import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { summarizeLifelog } from '@app/logic.js';
import persona from '@app/data/persona-dana.json';
import { StoreProvider, createInitialState, useStore } from '../state/store';
import type { AppState, Fields, LifelogSource } from '../state/types';
import LifelogCard from './LifelogCard';

// Exposes the parts of the store the card writes, so tests can assert on them.
function Probe() {
  const { state } = useStore();
  return (
    <output data-testid="probe">
      {JSON.stringify({
        screen: state.screen,
        enabledSources: state.enabledSources,
        fields: state.fields,
        trace: state.trace,
      })}
    </output>
  );
}

function readProbe(): {
  screen: string;
  enabledSources: LifelogSource[];
  fields: { career: string; now: string; pull: string };
  trace: { fn: string; input: string; output: string; via?: string }[];
} {
  return JSON.parse(screen.getByTestId('probe').textContent ?? '{}');
}

function renderCard(overrides: Partial<AppState> = {}) {
  const initialState: AppState = { ...createInitialState(), screen: 'lifelog', ...overrides };
  return render(
    <StoreProvider initialState={initialState}>
      <LifelogCard />
      <Probe />
    </StoreProvider>,
  );
}

// logic.js is untyped JS; the summary always has the three field keys.
const summarize = (sources: string[]) => summarizeLifelog(persona.lifelog, sources) as Fields;

const field = (name: RegExp) => screen.getByRole('textbox', { name }) as HTMLTextAreaElement;

describe('LifelogCard', () => {
  it('shows the Connected data card with the synthetic label', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Connected data' })).toBeInTheDocument();
    expect(screen.getByText('[SIMULATION] Sample persona: synthetic')).toBeInTheDocument();
  });

  it('starts with notes, saved links and calendar on, messages and messenger off', () => {
    renderCard();
    expect(screen.getByRole('switch', { name: /Notes/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Saved links/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Calendar/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Text messages/ })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /Messenger/ })).not.toBeChecked();
  });

  it('prefills the three fields from enabled sources with summarizeLifelog', () => {
    renderCard();
    const expected = summarize(['note', 'saved_link', 'calendar']);
    expect(field(/career/i).value).toBe(expected.career);
    expect(field(/now/i).value).toBe(expected.now);
    expect(field(/pulls/i).value).toBe(expected.pull);
    expect(readProbe().fields).toEqual(expected);
    // sms and messenger items stay out by default.
    expect(field(/now/i).value).not.toContain('budget is under review');
  });

  it('recomputes the fields when a toggle changes', () => {
    renderCard();
    fireEvent.click(screen.getByRole('switch', { name: /Text messages/ }));
    const sources = ['note', 'saved_link', 'calendar', 'sms'];
    const expected = summarize(sources);
    expect(readProbe().enabledSources.slice().sort()).toEqual(sources.slice().sort());
    expect(field(/now/i).value).toBe(expected.now);
    expect(field(/now/i).value).toContain('budget is under review');

    fireEvent.click(screen.getByRole('switch', { name: /Calendar/ }));
    expect(screen.getByRole('switch', { name: /Calendar/ })).not.toBeChecked();
    expect(field(/career/i).value).toBe(summarize(['note', 'saved_link', 'sms']).career);
  });

  it('keeps a field the user edited when toggles change', () => {
    renderCard();
    fireEvent.change(field(/now/i), { target: { value: 'My own words about now.' } });
    fireEvent.click(screen.getByRole('switch', { name: /Text messages/ }));
    fireEvent.click(screen.getByRole('switch', { name: /Saved links/ }));
    expect(field(/now/i).value).toBe('My own words about now.');
    const expected = summarize(['note', 'calendar', 'sms']);
    expect(field(/career/i).value).toBe(expected.career);
    expect(field(/pulls/i).value).toBe(expected.pull);
    expect(readProbe().fields.now).toBe('My own words about now.');
  });

  it('does not overwrite fields edited before the card opened', () => {
    const initial = createInitialState();
    renderCard({
      fields: { ...initial.fields, career: 'Typed on the inputs screen.' },
      editedFields: new Set(['career']),
    });
    expect(field(/career/i).value).toBe('Typed on the inputs screen.');
    fireEvent.click(screen.getByRole('switch', { name: /Messenger/ }));
    expect(field(/career/i).value).toBe('Typed on the inputs screen.');
  });

  it('lists every lifelog item with source icon, date and title, marked as simulation', () => {
    renderCard();
    const list = screen.getByRole('list', { name: 'Lifelog items' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(persona.lifelog.length);
    const first = persona.lifelog[0];
    expect(within(rows[0]).getByText(first.title)).toBeInTheDocument();
    expect(within(rows[0]).getByText(first.date)).toBeInTheDocument();
    expect(within(rows[0]).getByRole('img', { name: 'Note' })).toBeInTheDocument();
    expect(screen.getByText(/\[SIMULATION\] 14 days of synthetic lifelog/)).toBeInTheDocument();
  });

  it('marks items from switched-off sources as not used', () => {
    renderCard();
    const list = screen.getByRole('list', { name: 'Lifelog items' });
    const smsItem = persona.lifelog.find((item) => item.source === 'sms')!;
    const row = within(list).getByText(smsItem.title).closest('li')!;
    expect(within(row).getByText('Not used')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /Text messages/ }));
    expect(within(row).queryByText('Not used')).not.toBeInTheDocument();
  });

  it('records one summarizeLifelog trace step per actual recompute', () => {
    renderCard();
    expect(readProbe().trace.map((t) => t.fn)).toEqual(['summarizeLifelog']);
    fireEvent.click(screen.getByRole('switch', { name: /Messenger/ }));
    const trace = readProbe().trace;
    expect(trace.map((t) => t.fn)).toEqual(['summarizeLifelog', 'summarizeLifelog']);
    expect(trace[1].via).toBe('logic');
    expect(trace[1].input).toContain('messenger');
  });

  it('continues to the inputs screen', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(readProbe().screen).toBe('inputs');
  });

  it('uses no red warning colors', () => {
    const { container } = renderCard();
    expect(container.innerHTML).not.toMatch(/\bred\b|#f00|#ff0000|failed|missed/i);
  });
});
