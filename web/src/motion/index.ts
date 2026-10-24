// Motion helpers. CSS does most of the work (styles/base.css: sd-rise, .roll,
// [data-reveal]); these helpers cover what CSS cannot: per-item stagger
// delays, one-off Web Animations, scroll reveal and the reduced-motion check.
// Every helper is a no-op under prefers-reduced-motion and leaves the end state.
import { useEffect, useState, type CSSProperties, type RefObject } from 'react';

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

/** Motion tokens mirrored from styles/tokens.css for Web Animations calls. */
export const MOTION = {
  durPress: 120,
  durFast: 180,
  durSpring: 420,
  durEnter: 560,
  durScreen: 640,
  stagger: 45,
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeSpring: 'cubic-bezier(0.25, 1.12, 0.4, 1)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  riseLg: 24,
  riseMd: 16,
  riseSm: 12,
} as const;

/** True when the viewer asked for reduced motion (false where matchMedia is missing). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REDUCE_QUERY).matches;
}

/** React hook: tracks prefers-reduced-motion and updates when it changes. */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(REDUCE_QUERY);
    const onChange = () => setReduce(mql.matches);
    onChange();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);
  return reduce;
}

/** Delay in ms for the i-th item of a staggered group (capped so long lists stay quick). */
export function staggerDelay(index: number, step: number = MOTION.stagger, max = 7): number {
  return Math.min(Math.max(index, 0), max) * step;
}

/**
 * Inline style for a CSS-driven stagger: sets --sd-delay, which .anim-rise,
 * .anim-pop and [data-reveal] read. Usage: <li className="anim-rise" style={staggerStyle(i)}>.
 */
export function staggerStyle(index: number, step: number = MOTION.stagger, base = 0): CSSProperties {
  return { ['--sd-delay' as string]: `${base + staggerDelay(index, step)}ms` } as CSSProperties;
}

export type EnterOptions = {
  /** Rise distance in px (default 16). Use 0 with scale for a pop. */
  rise?: number;
  /** Start scale (default 1). */
  scale?: number;
  duration?: number;
  delay?: number;
  easing?: string;
};

function canAnimate(el: Element | null | undefined): el is HTMLElement {
  return !!el && typeof (el as HTMLElement).animate === 'function' && !prefersReducedMotion();
}

/** Rise-and-fade one element in with the Web Animations API. Returns the Animation or null. */
export function enter(el: Element | null | undefined, opts: EnterOptions = {}): Animation | null {
  if (!canAnimate(el)) return null;
  const { rise = MOTION.riseMd, scale = 1, duration = MOTION.durEnter, delay = 0, easing = MOTION.easeOut } = opts;
  const from = `translateY(${rise}px)${scale !== 1 ? ` scale(${scale})` : ''}`;
  return el.animate(
    [
      { opacity: 0, transform: from },
      { opacity: 1, transform: 'none' },
    ],
    { duration, delay, easing, fill: 'backwards' },
  );
}

/** Enter a list of elements one after another. */
export function stagger(
  els: Iterable<Element> | ArrayLike<Element>,
  opts: EnterOptions & { step?: number } = {},
): Animation[] {
  const { step = MOTION.stagger, delay = 0, ...rest } = opts;
  const out: Animation[] = [];
  Array.from(els).forEach((el, i) => {
    const a = enter(el, { ...rest, delay: delay + staggerDelay(i, step) });
    if (a) out.push(a);
  });
  return out;
}

/** Brief background flash, e.g. a field recomputed by a toggle. Token names or colors. */
export function flashBackground(
  el: Element | null | undefined,
  from = '--accent-tint',
  to = '--surface',
  duration = 600,
): Animation | null {
  if (!canAnimate(el)) return null;
  const read = (v: string) =>
    v.startsWith('--') ? getComputedStyle(el).getPropertyValue(v).trim() || 'transparent' : v;
  return el.animate([{ backgroundColor: read(from) }, { backgroundColor: read(to) }], {
    duration,
    easing: 'ease-out',
  });
}

/**
 * FLIP: call before a state change to record positions, then call the returned
 * function after the DOM updates (e.g. in useLayoutEffect) to slide items into place.
 */
export function flip(els: Iterable<Element> | ArrayLike<Element>): () => void {
  const items = Array.from(els) as HTMLElement[];
  const before = new Map(items.map((el) => [el, el.getBoundingClientRect().top]));
  return () => {
    if (prefersReducedMotion()) return;
    before.forEach((top, el) => {
      if (!el.isConnected || typeof el.animate !== 'function') return;
      const delta = top - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) return;
      el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], {
        duration: MOTION.durSpring,
        easing: MOTION.easeSpring,
      });
    });
  };
}

/**
 * Scroll reveal: adds .is-in once to every [data-reveal] inside the root as it
 * scrolls into view. Uses the root as the observer root when it scrolls itself
 * (laptop phone frame), else the viewport. Without IntersectionObserver (old
 * browsers, jsdom) or under reduced motion everything is marked at once.
 */
export function useReveal(rootRef: RefObject<HTMLElement | null>, key?: unknown): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const pending = () => Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)'));
    const showAll = () => pending().forEach((el) => el.classList.add('is-in'));

    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      showAll();
      if (typeof MutationObserver === 'undefined') return;
      const mo = new MutationObserver(showAll);
      mo.observe(root, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    const overflowY = getComputedStyle(root).overflowY;
    const scrollRoot = overflowY === 'auto' || overflowY === 'scroll' ? root : null;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          // Tall blocks may never reach 15%; a solid slice in view is enough.
          if (entry.intersectionRatio < 0.15 && entry.intersectionRect.height < 120) continue;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      },
      { root: scrollRoot, rootMargin: '0px 0px -8% 0px', threshold: [0, 0.05, 0.1, 0.15] },
    );
    const watch = () => pending().forEach((el) => io.observe(el));
    watch();
    const mo = typeof MutationObserver === 'undefined' ? null : new MutationObserver(watch);
    mo?.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo?.disconnect();
    };
  }, [rootRef, key]);
}
