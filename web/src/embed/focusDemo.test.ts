import { describe, expect, it, vi } from 'vitest';
import { FOCUS_DEMO_MESSAGE, requestDemoFocus } from './focusDemo';

function fakeWindow(inFrame: boolean) {
  const parent = { postMessage: vi.fn() };
  const self = {};
  const top = inFrame ? {} : self;
  return { win: { self, top, parent } as unknown as Window, parent };
}

describe('requestDemoFocus', () => {
  it('posts dam:focus-demo to the parent when running inside an iframe', () => {
    const { win, parent } = fakeWindow(true);
    expect(requestDemoFocus(win)).toBe(true);
    expect(parent.postMessage).toHaveBeenCalledTimes(1);
    expect(parent.postMessage).toHaveBeenCalledWith({ type: FOCUS_DEMO_MESSAGE }, '*');
    expect(FOCUS_DEMO_MESSAGE).toBe('dam:focus-demo');
  });

  it('does nothing when the app is the top window', () => {
    const { win, parent } = fakeWindow(false);
    expect(requestDemoFocus(win)).toBe(false);
    expect(parent.postMessage).not.toHaveBeenCalled();
  });

  it('swallows an error from a parent it cannot reach', () => {
    const win = {
      self: {},
      top: {},
      parent: {
        postMessage: () => {
          throw new Error('blocked');
        },
      },
    } as unknown as Window;
    expect(requestDemoFocus(win)).toBe(false);
  });
});
