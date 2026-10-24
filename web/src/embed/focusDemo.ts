// When the app runs inside the landing page's demo phone, ask the host page to bring the
// phone into focus. Outside an iframe (the app opened on its own) this does nothing.
export const FOCUS_DEMO_MESSAGE = 'dam:focus-demo';

type WindowLike = Pick<Window, 'self' | 'top' | 'parent'>;

export function requestDemoFocus(win: WindowLike = window): boolean {
  try {
    if (win.self === win.top) return false;
    win.parent.postMessage({ type: FOCUS_DEMO_MESSAGE }, '*');
    return true;
  } catch {
    // A cross-origin parent can throw on access; the focus effect is optional.
    return false;
  }
}
