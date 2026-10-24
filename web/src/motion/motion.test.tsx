import { render, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { enter, prefersReducedMotion, staggerDelay, staggerStyle, usePrefersReducedMotion, useReveal } from '.';

function Revealed() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  return (
    <div ref={ref}>
      <p data-reveal>One</p>
      <p data-reveal="sm">Two</p>
    </div>
  );
}

describe('motion helpers', () => {
  it('caps the stagger and exposes it as a CSS variable', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(2)).toBe(90);
    expect(staggerDelay(50)).toBe(7 * 45);
    expect(staggerStyle(1)).toEqual({ '--sd-delay': '45ms' });
  });

  it('reports no reduced-motion preference where matchMedia is missing', () => {
    expect(prefersReducedMotion()).toBe(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('reveals everything at once without IntersectionObserver', () => {
    const { getByText } = render(<Revealed />);
    expect(getByText('One')).toHaveClass('is-in');
    expect(getByText('Two')).toHaveClass('is-in');
  });

  it('skips Web Animations where they are not available', () => {
    expect(enter(document.createElement('div'))).toBeNull();
    expect(enter(null)).toBeNull();
  });
});
