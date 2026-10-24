import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import thinkOut from '../brain/__fixtures__/think-out.json';
import scenario from '../brain/__fixtures__/scenario.json';
import { brainUrl, getScenario, isThinkOutput, resetScenarioCache, think } from './brain';

const BASE = 'https://brain.example.test';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('brain client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BRAIN_URL', BASE);
    resetScenarioCache();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('posts the input to /v1/think and returns the validated answer', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(thinkOut));
    vi.stubGlobal('fetch', fetchMock);
    const input = { fields: { career: 'a', now: 'b', pull: 'c' } };
    const result = await think(input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.state.risk.level).toBe('green');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BASE}/v1/think`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual(input);
  });

  it('answers not_configured without a network call when VITE_BRAIN_URL is missing', async () => {
    vi.stubEnv('VITE_BRAIN_URL', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(brainUrl()).toBeNull();
    await expect(think({})).resolves.toEqual({ ok: false, reason: 'not_configured' });
    await expect(getScenario()).resolves.toEqual({ ok: false, reason: 'not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gives up after 8 seconds with reason timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      ),
    );
    const pending = think({});
    await vi.advanceTimersByTimeAsync(7999);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ ok: false, reason: 'timeout' });
  });

  it('rejects an answer with the wrong shape', async () => {
    const { trace: _trace, ...noTrace } = thinkOut;
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(noTrace)));
    await expect(think({})).resolves.toEqual({ ok: false, reason: 'bad_shape' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })));
    await expect(think({})).resolves.toEqual({ ok: false, reason: 'bad_shape' });
    expect(isThinkOutput({ ...thinkOut, state: { ...thinkOut.state, risk: null } })).toBe(false);
    expect(isThinkOutput(thinkOut)).toBe(true);
  });

  it('turns HTTP errors and network errors into reasons, never throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: { code: 'rate_limited', message: 'x' } }, 429)));
    await expect(think({})).resolves.toEqual({ ok: false, reason: 'http_error' });
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(think({})).resolves.toEqual({ ok: false, reason: 'network' });
  });

  it('fetches the scenario once and caches it; a failure is retried next time', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => Promise.reject(new TypeError('offline')))
      .mockImplementation(async () => jsonResponse(scenario));
    vi.stubGlobal('fetch', fetchMock);
    await expect(getScenario()).resolves.toEqual({ ok: false, reason: 'network' });
    const first = await getScenario();
    const second = await getScenario();
    expect(first.ok).toBe(true);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1] as unknown as [string])[0]).toBe(`${BASE}/v1/scenario`);
  });
});
