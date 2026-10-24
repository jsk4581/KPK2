import persona from '@app/data/persona-dana.json';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIELD_LABELS } from './Inputs';
import { SIMULATION_LABEL } from './Landing';
import { FALLBACK, jsonResponse, renderFlow, state, stubFetch } from './Paths.testkit';

afterEach(() => {
  vi.unstubAllGlobals();
});

function toInputs() {
  renderFlow();
  fireEvent.click(screen.getByRole('button', { name: 'Load sample persona' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue (test)' }));
}

describe('Inputs', () => {
  it('shows the sample persona text in the three fields with the SIMULATION label', () => {
    toInputs();
    expect(screen.getByLabelText(FIELD_LABELS.career.label)).toHaveValue(persona.fields.career);
    expect(screen.getByLabelText(FIELD_LABELS.now.label)).toHaveValue(persona.fields.now);
    expect(screen.getByLabelText(FIELD_LABELS.pull.label)).toHaveValue(persona.fields.pull);
    expect(screen.getByText(SIMULATION_LABEL)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show my paths' })).toBeEnabled();
  });

  it('marks a typed field as edited', () => {
    toInputs();
    fireEvent.change(screen.getByLabelText(FIELD_LABELS.pull.label), { target: { value: 'Teaching' } });
    expect(state().fields.pull).toBe('Teaching');
    expect(state().editedFields.has('pull')).toBe(true);
  });

  it('Start: no SIMULATION label, and Show my paths waits for some text', () => {
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.queryByText(SIMULATION_LABEL)).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Show my paths' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(FIELD_LABELS.career.label), {
      target: { value: 'Ten years of email copy and landing pages.' },
    });
    expect(button).toBeEnabled();
    expect(screen.queryByText(SIMULATION_LABEL)).not.toBeInTheDocument();
  });

  it('Start: the synthetic lifelog is never read into the skills', async () => {
    stubFetch(async () => jsonResponse({ source: 'fallback', paths: FALLBACK }));
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.change(screen.getByLabelText(FIELD_LABELS.career.label), {
      target: { value: 'Ten years of email copy and landing pages.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show my paths' }));
    await waitFor(() => expect(state().screen).toBe('paths'));
    expect(state().lifelogConnected).toBe(false);
    const skillsStep = state().trace.find((t) => t.fn === 'extractSkills');
    expect(skillsStep?.input).toMatch(/lifelog: 0 items/);
  });
});
