import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import thinkOut from '../brain/__fixtures__/think-out.json';
import scenario from '../brain/__fixtures__/scenario.json';
import { brainUrl, getScenario, isThinkOutput, resetBrainPreference, resetScenarioCache, think } from './brain';

const BASE = 'https://brain.example.test';
const BACKUP = 'https://brain-backup.example.test';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('brain client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BRAIN_URL', BASE);
    vi.stubEnv('VITE_BRAIN_URL_BACKUP', '');
    resetScenarioCache();
    resetBrainPreference();
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

  it('gives up after 6 seconds with reason timeout', async () => {
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
    await vi.advanceTimersByTimeAsync(5999);
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

describe('brain client with a backup address', () => {
  const thinkUrls = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls.map((c) => (c as unknown as [string])[0]);

  beforeEach(() => {
    vi.stubEnv('VITE_BRAIN_URL', BASE);
    vi.stubEnv('VITE_BRAIN_URL_BACKUP', BACKUP);
    resetScenarioCache();
    resetBrainPreference();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('primary answers: the backup is not called', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(thinkOut));
    vi.stubGlobal('fetch', fetchMock);
    const result = await think({});
    expect(result.ok && result.served).toBe('primary');
    expect(thinkUrls(fetchMock)).toEqual([`${BASE}/v1/think`]);
  });

  it('primary network error: the same request goes to the backup', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => Promise.reject(new TypeError('Failed to fetch')))
      .mockImplementation(async () => jsonResponse(thinkOut));
    vi.stubGlobal('fetch', fetchMock);
    const input = { fields: { career: 'a', now: 'b', pull: 'c' } };
    const result = await think(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.served).toBe('backup');
      expect(result.data.state.risk.level).toBe('green');
    }
    expect(thinkUrls(fetchMock)).toEqual([`${BASE}/v1/think`, `${BACKUP}/v1/think`]);
    const backupInit = (fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1];
    expect(backupInit.method).toBe('POST');
    expect(JSON.parse(String(backupInit.body))).toEqual(input);
  });

  it('primary 503: the backup answers', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith(BASE) ? jsonResponse({ error: 'tunnel down' }, 503) : jsonResponse(thinkOut),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await think({});
    expect(result.ok && result.served).toBe('backup');
    expect(thinkUrls(fetchMock)).toEqual([`${BASE}/v1/think`, `${BACKUP}/v1/think`]);
  });

  it('primary 408, 429 or a bad answer: the backup is tried', async () => {
    for (const primary of [jsonResponse({}, 408), jsonResponse({}, 429), jsonResponse({ nope: true })]) {
      resetBrainPreference();
      const fetchMock = vi.fn(async (url: string) => (url.startsWith(BASE) ? primary.clone() : jsonResponse(thinkOut)));
      vi.stubGlobal('fetch', fetchMock);
      const result = await think({});
      expect(result.ok && result.served).toBe('backup');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }
  });

  it('primary 400: a bad request is not retried on the backup', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: 'bad input' }, 400));
    vi.stubGlobal('fetch', fetchMock);
    await expect(think({})).resolves.toEqual({ ok: false, reason: 'http_error' });
    expect(thinkUrls(fetchMock)).toEqual([`${BASE}/v1/think`]);
  });

  it('both fail: answers offline with the last reason, never throws', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => Promise.reject(new TypeError('Failed to fetch')))
      .mockImplementationOnce(async () => jsonResponse({}, 502));
    vi.stubGlobal('fetch', fetchMock);
    await expect(think({})).resolves.toEqual({ ok: false, reason: 'http_error' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('both time out: gives up after 6 seconds each', async () => {
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
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(11999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ ok: false, reason: 'timeout' });
  });

  it('after a backup success the next call starts on the backup, and falls back to the primary', async () => {
    let primaryUp = false;
    let backupUp = true;
    const fetchMock = vi.fn(async (url: string) => {
      const up = url.startsWith(BASE) ? primaryUp : backupUp;
      return up ? jsonResponse(url.endsWith('/v1/scenario') ? scenario : thinkOut) : Promise.reject(new TypeError('down'));
    });
    vi.stubGlobal('fetch', fetchMock);

    expect((await think({})).ok).toBe(true);
    expect(thinkUrls(fetchMock)).toEqual([`${BASE}/v1/think`, `${BACKUP}/v1/think`]);

    // Next call (think or scenario) goes straight to the backup.
    fetchMock.mockClear();
    primaryUp = true;
    const second = await think({});
    expect(second.ok && second.served).toBe('backup');
    const scen = await getScenario();
    expect(scen.ok && scen.served).toBe('backup');
    expect(thinkUrls(fetchMock)).toEqual([`${BACKUP}/v1/think`, `${BACKUP}/v1/scenario`]);

    // Backup goes down: the primary is tried next and becomes the preferred one again.
    fetchMock.mockClear();
    backupUp = false;
    const third = await think({});
    expect(third.ok && third.served).toBe('primary');
    const fourth = await think({});
    expect(fourth.ok && fourth.served).toBe('primary');
    expect(thinkUrls(fetchMock)).toEqual([`${BACKUP}/v1/think`, `${BASE}/v1/think`, `${BASE}/v1/think`]);
  });

  it('getScenario fails over the same way', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith(BASE) ? jsonResponse({}, 500) : jsonResponse(scenario),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await getScenario();
    expect(result.ok && result.served).toBe('backup');
    expect(thinkUrls(fetchMock)).toEqual([`${BASE}/v1/scenario`, `${BACKUP}/v1/scenario`]);
  });

  it('only the backup configured: it is used and labelled backup', async () => {
    vi.stubEnv('VITE_BRAIN_URL', '');
    const fetchMock = vi.fn(async () => jsonResponse(thinkOut));
    vi.stubGlobal('fetch', fetchMock);
    const result = await think({});
    expect(result.ok && result.served).toBe('backup');
    expect(thinkUrls(fetchMock)).toEqual([`${BACKUP}/v1/think`]);
  });

  it('neither configured: not_configured without a network call', async () => {
    vi.stubEnv('VITE_BRAIN_URL', '');
    vi.stubEnv('VITE_BRAIN_URL_BACKUP', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(think({})).resolves.toEqual({ ok: false, reason: 'not_configured' });
    await expect(getScenario()).resolves.toEqual({ ok: false, reason: 'not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
