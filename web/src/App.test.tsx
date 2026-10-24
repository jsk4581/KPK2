import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('renders the landing screen with a Reset button and the storage notice', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Landing' })).toBeInTheDocument();
    expect(screen.getByText('Nothing you type is stored.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('heading', { name: 'Landing' })).toBeInTheDocument();
  });
});
