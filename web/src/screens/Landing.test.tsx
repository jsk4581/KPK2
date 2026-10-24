import persona from '@app/data/persona-dana.json';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { requestDemoFocus } from '../embed/focusDemo';
import { SIMULATION_LABEL } from './Landing';
import { renderFlow, state } from './Paths.testkit';

vi.mock('../embed/focusDemo', () => ({ requestDemoFocus: vi.fn(() => false) }));

describe('Landing', () => {
  it('shows the empathy line, both entry buttons and the synthetic persona label', () => {
    renderFlow();
    expect(screen.getByText('My clients use ChatGPT now.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load sample persona' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByText(SIMULATION_LABEL)).toBeInTheDocument();
    expect(SIMULATION_LABEL).toBe('[SIMULATION] Sample persona: synthetic');
    expect(screen.getByRole('img', { name: /SIMULATION/ })).toBeInTheDocument();
  });

  it('Load sample persona fills the three fields with Dana and goes to the lifelog card', () => {
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: 'Load sample persona' }));
    expect(state().screen).toBe('lifelog');
    expect(state().fields).toEqual(persona.fields);
    expect(state().editedFields.size).toBe(0);
  });

  it('Load sample persona asks the host page to focus the demo phone; Start does not', () => {
    const spy = vi.mocked(requestDemoFocus);
    spy.mockClear();
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: 'Load sample persona' }));
    expect(spy).toHaveBeenCalledTimes(1);
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('Start opens the inputs with three empty fields', () => {
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(state().screen).toBe('inputs');
    expect(state().fields).toEqual({ career: '', now: '', pull: '' });
    for (const box of screen.getAllByRole('textbox')) expect(box).toHaveValue('');
  });
});
