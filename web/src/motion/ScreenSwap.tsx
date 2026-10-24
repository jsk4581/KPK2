// Screen-to-screen transition. The shell remounts <main class="screen"> per
// screen, so the old screen is gone the moment React commits. Right before that
// commit this component copies the old screen into a "ghost": a static,
// aria-hidden, inert copy inside a closed shadow root (so no query, test or
// assistive tech ever sees duplicate text), laid exactly over where the old
// screen was. The ghost then fades and slides out while the new screen's blocks
// rise in (CSS in App.css, delayed by --sd-swap). No ghost under reduced
// motion, in jsdom, or in browsers without constructable stylesheets.
import { Component, type ReactNode, type RefObject } from 'react';
import { prefersReducedMotion } from './index';

/** How long the old screen takes to leave, and how long the new one waits. */
export const SWAP = {
  exitMs: 200,
  enterDelayMs: 140,
  shift: 16,
  /** Opacity drops early so old and new text barely overlap. */
  easeExit: 'cubic-bezier(0.2, 0.6, 0.35, 1)',
} as const;

export type SwapDirection = 'forward' | 'back';

/** Forward when the next screen sits later in the flow than the current one. */
export function swapDirection(order: readonly string[], from: string, to: string): SwapDirection {
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  return a >= 0 && b >= 0 && b < a ? 'back' : 'forward';
}

type Snapshot = {
  clone: HTMLElement;
  /** Where the visible slice of the old screen was. */
  box: { top: number; left: number; width: number; height: number };
  /** Offset of the clone inside that slice (scrolled screens start above it). */
  offsetTop: number;
  /** Laptop: the phone screen the ghost is clipped to. Phone view: null (viewport). */
  host: HTMLElement | null;
};

function supported(el: HTMLElement | null): el is HTMLElement {
  if (!el || typeof el.animate !== 'function' || typeof el.attachShadow !== 'function') return false;
  if (typeof CSSStyleSheet !== 'function' || !('replaceSync' in CSSStyleSheet.prototype)) return false;
  if (!('adoptedStyleSheets' in Document.prototype)) return false;
  return !prefersReducedMotion();
}

let pageSheet: { key: string; sheet: CSSStyleSheet } | null = null;
let ghostSheet: CSSStyleSheet | null = null;

// The page's own CSS, copied into the ghost's shadow root. Cross-origin sheets
// (the font stylesheet) are skipped: @font-face already applies to shadow trees.
function pageStyles(): CSSStyleSheet {
  const parts: string[] = [];
  let count = 0;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (typeof CSSImportRule !== 'undefined' && rule instanceof CSSImportRule) continue;
        parts.push(rule.cssText);
        count += 1;
      }
    } catch {
      // Cross-origin stylesheet: not readable, not needed.
    }
  }
  const key = `${document.styleSheets.length}:${count}:${parts.join('').length}`;
  if (pageSheet?.key === key) return pageSheet.sheet;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(parts.join('\n'));
  pageSheet = { key, sheet };
  return sheet;
}

function ghostStyles(): CSSStyleSheet {
  if (ghostSheet) return ghostSheet;
  ghostSheet = new CSSStyleSheet();
  // The copy is a still frame: nothing inside it animates on its own.
  ghostSheet.replaceSync(
    `*, *::before, *::after { animation: none !important; transition: none !important; }
     .ghost-inner { position: absolute; left: 0; right: 0; margin: 0; }`,
  );
  return ghostSheet;
}

function capture(main: HTMLElement | null): Snapshot | null {
  if (!supported(main)) return null;
  const parent = main.parentElement;
  if (!parent) return null;
  const rect = main.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  const clone = main.cloneNode(true) as HTMLElement;
  // Form state lives in properties, not attributes: carry it over.
  const live = main.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  const copies = clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  live.forEach((el, i) => {
    const copy = copies[i];
    if (!copy) return;
    copy.value = el.value;
    if (el instanceof HTMLInputElement && copy instanceof HTMLInputElement) copy.checked = el.checked;
  });
  clone.classList.remove('is-entering');
  clone.removeAttribute('data-first');
  clone.removeAttribute('style');
  clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  clone.classList.add('ghost-inner');

  // Laptop: the screen is its own scroll box inside the phone frame.
  // Phone view: the page scrolls and the frame wrapper has no box.
  const framed = getComputedStyle(parent).display !== 'contents';
  if (framed) {
    const p = parent.getBoundingClientRect();
    return {
      clone,
      box: {
        top: rect.top - p.top - parent.clientTop,
        left: rect.left - p.left - parent.clientLeft,
        width: rect.width,
        height: rect.height,
      },
      offsetTop: -main.scrollTop,
      host: parent,
    };
  }
  const top = Math.max(rect.top, 0);
  const bottom = Math.min(rect.bottom, window.innerHeight);
  if (bottom <= top) return null;
  return {
    clone,
    box: { top, left: rect.left, width: rect.width, height: bottom - top },
    offsetTop: rect.top - top,
    host: null,
  };
}

let current: { el: HTMLElement; anim: Animation | null } | null = null;

function clearGhost() {
  if (!current) return;
  current.anim?.cancel();
  current.el.remove();
  current = null;
}

function play(snap: Snapshot, direction: SwapDirection) {
  clearGhost();
  const ghost = document.createElement('div');
  ghost.className = 'screen-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.setAttribute('inert', '');
  const { box } = snap;
  Object.assign(ghost.style, {
    position: snap.host ? 'absolute' : 'fixed',
    top: `${box.top}px`,
    left: `${box.left}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: '8',
    background: 'transparent',
  });
  const root = ghost.attachShadow({ mode: 'closed' });
  root.adoptedStyleSheets = [pageStyles(), ghostStyles()];
  snap.clone.style.top = `${snap.offsetTop}px`;
  root.appendChild(snap.clone);
  (snap.host ?? document.body).appendChild(ghost);

  const shift = direction === 'back' ? SWAP.shift : -SWAP.shift;
  const anim = ghost.animate(
    [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: `translateY(${shift}px) scale(0.985)` },
    ],
    { duration: SWAP.exitMs, easing: SWAP.easeExit, fill: 'forwards' },
  );
  current = { el: ghost, anim };
  const done = () => {
    if (current?.el === ghost) clearGhost();
    else ghost.remove();
  };
  anim.onfinish = done;
  anim.oncancel = () => ghost.remove();
}

type Props = {
  /** Changes when the screen changes (the same value as the <main> key). */
  screenKey: string;
  /** The current <main class="screen"> element. */
  screenRef: RefObject<HTMLElement | null>;
  /** Screen order in the flow, to tell forward from back. */
  order: readonly string[];
  children: ReactNode;
};

export class ScreenSwap extends Component<Props> {
  // Runs after render, before React touches the DOM: the old screen is still there.
  getSnapshotBeforeUpdate(prev: Props): Snapshot | null {
    if (prev.screenKey === this.props.screenKey) return null;
    return capture(this.props.screenRef.current);
  }

  componentDidUpdate(prev: Props, _state: unknown, snap: Snapshot | null) {
    if (prev.screenKey === this.props.screenKey) return;
    const main = this.props.screenRef.current;
    // Phone view: a new screen starts at the top of the page.
    if (main && main.parentElement && getComputedStyle(main.parentElement).display === 'contents' && window.scrollY > 0) {
      window.scrollTo(0, 0);
    }
    if (!snap || !main) return;
    // The new screen's entrance waits a beat for the old one to clear.
    main.style.setProperty('--sd-swap', `${SWAP.enterDelayMs}ms`);
    play(snap, swapDirection(this.props.order, prev.screenKey, this.props.screenKey));
  }

  componentWillUnmount() {
    clearGhost();
  }

  render() {
    return this.props.children;
  }
}
