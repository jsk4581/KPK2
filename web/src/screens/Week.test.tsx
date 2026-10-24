/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildWeek } from '@app/logic.js';
import persona from '@app/data/persona-dana.json';
import { StoreProvider, createInitialState, useStore } from '../state/store';
import type { AppState, PathsResponse } from '../state/types';
import Week from './Week';

// Fixture: the synthetic Dana fallback for the messaging path (Tue, Thu, Sat; demo today is Thu).
const paths = persona.fallback as unknown as { paths: PathsResponse['paths'] };
const draft = paths.paths.find((p) => p.role_id === 'messaging-consultant')!;
const ROLE_TITLE = 'Messaging & Positioning Consultant';

function weekState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...createInitialState(),
    screen: 'week',
    rankedRoles: [
      { id: 'messaging-consultant', title: ROLE_TITLE, ratio: 0.67, transfers: [], missing: [] },
    ],
    paths: { source: 'fallback', paths: paths.paths },
    chosenPathId: 'messaging-consultant',
    week: buildWeek(draft, persona.today),
    ...overrides,
  };
}

// Shows the screen name and trace size so tests can see navigation and trace writes.
function Probe() {
  const { state } = useStore();
  return (
    <div data-testid="probe">
      {state.screen}|{state.trace.map((t) => t.fn).join(',')}|{state.checkins.length}
    </div>
  );
}

function renderWeek(overrides: Partial<AppState> = {}) {
  return render(
    <StoreProvider initialState={weekState(overrides)}>
      <Week />
      <Probe />
    </StoreProvider>,
  );
}

function row(id: string) {
  return screen.getByTestId(`action-${id}`);
}

function click(id: string, name: 'Done' | 'Not today') {
  fireEvent.click(within(row(id)).getByRole('button', { name }));
}

describe('Week screen', () => {
  it('shows three actions with days, minutes, the collapsed 12-week arc and progress starting at 1/4', () => {
    renderWeek();
    expect(screen.getByRole('heading', { name: 'This week' })).toBeInTheDocument();
    for (const id of ['a1', 'a2', 'a3']) {
      expect(within(row(id)).getByRole('button', { name: 'Done' })).toBeInTheDocument();
      expect(within(row(id)).getByRole('button', { name: 'Not today' })).toBeInTheDocument();
    }
    expect(within(row('a1')).getByText(/Tue/)).toBeInTheDocument();
    expect(within(row('a1')).getByText(/30 min/)).toBeInTheDocument();
    const arc = screen.getByText('12-week arc').closest('details')!;
    expect(arc).not.toHaveAttribute('open');
    expect(arc).toHaveTextContent(draft.arc_12w);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByText('Progress 1/4')).toBeInTheDocument();
    expect(screen.getByText('0/3 done')).toBeInTheDocument();
  });

  it('Not today moves the action to the next day after today, with the rest-day reply and summary', () => {
    renderWeek();
    click('a1', 'Not today');
    const reply = screen.getByRole('status');
    const lines = within(reply).getAllByRole('listitem').map((li) => li.textContent);
    expect(lines[0]).toBe('Today was a rest day, not a missed day.');
    expect(lines[2]).toMatch(/^If you have 10 minutes: /);
    expect(lines[3]).toBe('Moved to Fri');
    expect(lines).toHaveLength(4);
    // The action is kept (not deleted) and still checkable on its new day.
    expect(within(row('a1')).getByText(/Moved to Fri/)).toBeInTheDocument();
    expect(within(row('a1')).getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.getByText('0/3 done · 1 moved')).toBeInTheDocument();
    expect(screen.getByTestId('probe')).toHaveTextContent('week|applyCheckin|1');
  });

  it('Not today on the last action moves it to next week and hides its buttons', () => {
    renderWeek();
    click('a3', 'Not today');
    expect(within(screen.getByRole('status')).getByText('Moved to next week')).toBeInTheDocument();
    expect(within(row('a3')).getByText(/Next week/)).toBeInTheDocument();
    expect(within(row('a3')).queryByRole('button')).toBeNull();
    expect(screen.getAllByTestId(/^action-/)).toHaveLength(3);
  });

  it('first Done shows the share card once, with Copy text; done actions lose their buttons', () => {
    renderWeek();
    click('a2', 'Done');
    const card = screen.getByRole('region', { name: 'Share card' });
    expect(card).toHaveTextContent(ROLE_TITLE);
    expect(card).toHaveTextContent(draft.week.actions[1].title);
    expect(card).toHaveTextContent('1/3 done');
    expect(within(card).getByRole('button', { name: 'Copy text' })).toBeInTheDocument();
    expect(within(row('a2')).queryByRole('button')).toBeNull();
    expect(screen.getByText('Progress 2/4')).toBeInTheDocument();

    click('a1', 'Done');
    expect(screen.queryByRole('region', { name: 'Share card' })).toBeNull();
    expect(screen.getByText('2/3 done')).toBeInTheDocument();
  });

  it('Copy text never throws when the clipboard is unavailable', () => {
    renderWeek();
    click('a2', 'Done');
    fireEvent.click(screen.getByRole('button', { name: 'Copy text' }));
    expect(screen.getByRole('region', { name: 'Share card' })).toBeInTheDocument();
  });

  it('the first Done after a Not today adds the comeback line, only once', () => {
    renderWeek();
    click('a1', 'Not today');
    click('a2', 'Done');
    expect(screen.getByText('Welcome back. Showing up again is the hard part.')).toBeInTheDocument();
    click('a1', 'Done');
    expect(screen.queryByText('Welcome back. Showing up again is the hard part.')).toBeNull();
  });

  it('condition 1 or 2 shows the 10-minute versions; 3 to 5 shows the originals', () => {
    renderWeek();
    fireEvent.click(screen.getByRole('button', { name: 'Condition 2' }));
    expect(within(row('a1')).getByText(draft.week.actions[0].short)).toBeInTheDocument();
    expect(within(row('a1')).getByText(/10 min/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Condition 2' })).toHaveAttribute('aria-pressed', 'true');
    // Check-ins still work on the reduced view.
    click('a1', 'Not today');
    expect(within(row('a1')).getByText(/Moved to Fri/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Condition 4' }));
    expect(within(row('a1')).getByText(draft.week.actions[0].title)).toBeInTheDocument();
    expect(screen.getByTestId('probe')).toHaveTextContent('sizeForCondition');
  });

  it('Change path returns to the Paths screen', () => {
    renderWeek();
    fireEvent.click(screen.getByRole('button', { name: 'Change path' }));
    expect(screen.getByTestId('probe')).toHaveTextContent(/^paths\|/);
  });

  it('without a chosen path it offers a way back instead of crashing', () => {
    renderWeek({ week: null, chosenPathId: null });
    expect(screen.getByText(/No path chosen yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose a path' }));
    expect(screen.getByTestId('probe')).toHaveTextContent(/^paths\|/);
  });

  it('never uses failure wording', () => {
    renderWeek();
    click('a1', 'Not today');
    click('a3', 'Not today');
    click('a2', 'Done');
    const text = document.body.textContent!.replace(/not a missed day/gi, '');
    expect(text).not.toMatch(/\b(fail\w*|missed|overdue|late)\b/i);
  });
});

// Red-family warning colors are banned (do not scold the user).
function hue(hex: string): { h: number; s: number } {
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  if (d === 0) return { h: 0, s };
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s };
}

// Vitest does not load CSS content through imports, so read the stylesheet from disk
// (tests run with web/ as the working directory).
const weekCss = readFileSync(join(process.cwd(), 'src/screens/Week.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

describe('Week styles', () => {
  it('contain no red-family colors', () => {
    expect(weekCss).not.toMatch(/\b(red|crimson|tomato|firebrick|darkred|indianred|salmon|orangered)\b/i);
    const hexes = weekCss.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) ?? [];
    expect(hexes.length).toBeGreaterThan(0);
    for (const hex of hexes) {
      const { h, s } = hue(hex);
      const reddish = s > 0.25 && (h < 25 || h > 335);
      expect(reddish, `${hex} is a red-family color`).toBe(false);
    }
    expect(weekCss).not.toMatch(/rgba?\(\s*(2[0-5]\d|1[5-9]\d)\s*,\s*([0-9]{1,2})\s*,\s*([0-9]{1,2})\s*[,)]/);
  });
});
