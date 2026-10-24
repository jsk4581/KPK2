import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('renders the landing screen with a Reset button and the storage notice', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Load sample persona' })).toBeInTheDocument();
    expect(screen.getByText('Nothing you type is stored.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByRole('button', { name: 'Show my paths' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('button', { name: 'Load sample persona' })).toBeInTheDocument();
  });

  it('routes Load sample persona through the lifelog card to the inputs', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Load sample persona' }));
    expect(screen.getByRole('heading', { name: 'Connected data' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('button', { name: 'Show my paths' })).toBeInTheDocument();
  });
});
