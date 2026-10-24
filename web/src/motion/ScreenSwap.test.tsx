import { render } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { ScreenSwap, swapDirection } from './ScreenSwap';

const ORDER = ['landing', 'lifelog', 'inputs', 'paths', 'week', 'progress'] as const;

function Harness({ screen }: { screen: string }) {
  const ref = useRef<HTMLElement>(null);
  return (
    <ScreenSwap screenKey={screen} screenRef={ref} order={ORDER}>
      <main className="screen" key={screen} ref={ref}>
        <h2>{screen}</h2>
      </main>
    </ScreenSwap>
  );
}

describe('ScreenSwap', () => {
  it('tells forward steps from steps back', () => {
    expect(swapDirection(ORDER, 'week', 'progress')).toBe('forward');
    expect(swapDirection(ORDER, 'progress', 'week')).toBe('back');
    expect(swapDirection(ORDER, 'paths', 'landing')).toBe('back');
    expect(swapDirection(ORDER, 'landing', 'unknown')).toBe('forward');
  });

  it('swaps screens without leaving a copy behind where motion cannot run', () => {
    const { rerender, container } = render(<Harness screen="week" />);
    rerender(<Harness screen="progress" />);
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(document.querySelector('.screen-ghost')).toBeNull();
    expect(container.querySelector('h2')).toHaveTextContent('progress');
  });
});
