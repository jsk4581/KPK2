// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { handlePaths, LLM_TIMEOUT_MS, MODEL } from './paths.js';

const require = createRequire(import.meta.url);
const persona = require('../../app/data/persona-dana.json');

const FAKE_KEY = 'test-key-not-real';
const ROLE_IDS = ['messaging-consultant', 'brand-voice-systems', 'copy-educator'];

function validBody() {
  return {
    fields: {
      career: 'Seven years of conversion copy for small software teams.',
      now: 'Two retainers ended this year.',
      pull: 'Workshops and positioning.',
    },
    roles: ROLE_IDS.map((id) => {
      const role = persona.roles.find((r) => r.id === id);
      return { id, title: role.title, transfers: ['discovery-call'], missing: ['project-pricing'] };
    }),
  };
}

function llmPath(roleId) {
  return {
    role_id: roleId,
    one_liner: `A drafted line for ${roleId}.`,
    first_two_weeks: ['Step one.', 'Step two.'],
    week: {
      actions: [
        { title: 'Action one', minutes: 30, day: 'Tue', short: 'Ten-minute one.' },
        { title: 'Action two', minutes: 20, day: 'Thu', short: 'Ten-minute two.' },
        { title: 'Action three', minutes: 15, day: 'Sat', short: 'Ten-minute three.' },
      ],
    },
    arc_12w: 'A twelve-week arc in one line.',
  };
}

function claudeMessage(payload, overrides = {}) {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: MODEL,
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload) }],
    ...overrides,
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function expectedFallback(roleIds = ROLE_IDS) {
  return roleIds.map((id) => persona.fallback.paths.find((p) => p.role_id === id));
}

// Minimal stand-ins for the Vercel Node request and response objects.
function fakeReq(body, method = 'POST') {
  return { method, headers: { 'content-type': 'application/json' }, body };
}

function fakeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    payload: undefined,
    setHeader(name, value) {
      res.headers[name.toLowerCase()] = value;
      return res;
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(value) {
      res.payload = value;
      return res;
    },
  };
  return res;
}

async function callHandler(body, method) {
  const res = fakeRes();
  await handler(fakeReq(body, method), res);
  return res;
}

describe('POST /api/paths', () => {
  let savedKey;

  beforeEach(() => {
    savedKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = FAKE_KEY;
  });

  afterEach(() => {
    if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = savedKey;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns fallback with 200 and never calls fetch when the key is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await callHandler(validBody());
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ source: 'fallback', paths: expectedFallback() });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns llm paths in the requested role order for a valid Claude response', async () => {
    const reversed = [...ROLE_IDS].reverse().map(llmPath);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(claudeMessage({ paths: reversed })));
    vi.stubGlobal('fetch', fetchMock);
    const res = await callHandler(validBody());
    expect(res.statusCode).toBe(200);
    expect(res.payload.source).toBe('llm');
    expect(res.payload.paths.map((p) => p.role_id)).toEqual(ROLE_IDS);
    expect(res.payload.paths[0]).toEqual(llmPath(ROLE_IDS[0]));
  });

  it('calls the Messages API once with the model, key header and a JSON schema output format', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(claudeMessage({ paths: ROLE_IDS.map(llmPath) })));
    vi.stubGlobal('fetch', fetchMock);
    await callHandler(validBody());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.method).toBe('POST');
    expect(init.headers['x-api-key']).toBe(FAKE_KEY);
    expect(init.headers['anthropic-version']).toBeTruthy();
    expect(init.signal).toBeDefined();
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe('claude-sonnet-5-5');
    expect(sent.output_config.format.type).toBe('json_schema');
    expect(sent.temperature).toBeUndefined();
    // The person's text reaches the model; the key never does.
    expect(init.body).toContain('Two retainers ended this year.');
    expect(init.body).not.toContain(FAKE_KEY);
  });

  it('falls back when Claude returns an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ type: 'error', error: { type: 'overloaded_error' } }, 529)));
    const res = await callHandler(validBody());
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ source: 'fallback', paths: expectedFallback() });
  });

  it('falls back when fetch itself throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));
    const res = await callHandler(validBody());
    expect(res.statusCode).toBe(200);
    expect(res.payload.source).toBe('fallback');
  });

  it('falls back when the model output is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(claudeMessage('Here are your paths!'))));
    const res = await callHandler(validBody());
    expect(res.payload.source).toBe('fallback');
  });

  it('falls back when the response stops for a refusal or max tokens', async () => {
    for (const stop of ['refusal', 'max_tokens']) {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse(claudeMessage({ paths: ROLE_IDS.map(llmPath) }, { stop_reason: stop }))),
      );
      const res = await callHandler(validBody());
      expect(res.payload.source).toBe('fallback');
    }
  });

  const badShapes = {
    'a missing role': () => ({ paths: ROLE_IDS.slice(0, 2).map(llmPath) }),
    'an unknown role id': () => ({ paths: [llmPath(ROLE_IDS[0]), llmPath(ROLE_IDS[1]), llmPath('ux-writer')] }),
    'only one first-two-weeks step': () => {
      const paths = ROLE_IDS.map(llmPath);
      paths[1].first_two_weeks = ['Only one.'];
      return { paths };
    },
    'an action longer than 30 minutes': () => {
      const paths = ROLE_IDS.map(llmPath);
      paths[0].week.actions[2].minutes = 45;
      return { paths };
    },
    'an action on NextWeek': () => {
      const paths = ROLE_IDS.map(llmPath);
      paths[2].week.actions[0].day = 'NextWeek';
      return { paths };
    },
    'two actions instead of three': () => {
      const paths = ROLE_IDS.map(llmPath);
      paths[0].week.actions.pop();
      return { paths };
    },
    'an empty arc': () => {
      const paths = ROLE_IDS.map(llmPath);
      paths[1].arc_12w = '  ';
      return { paths };
    },
    'failure wording': () => {
      const paths = ROLE_IDS.map(llmPath);
      paths[0].one_liner = 'You failed to adapt, so pivot now.';
      return { paths };
    },
  };

  for (const [name, build] of Object.entries(badShapes)) {
    it(`falls back when the model JSON has ${name}`, async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(claudeMessage(build()))));
      const res = await callHandler(validBody());
      expect(res.statusCode).toBe(200);
      expect(res.payload).toEqual({ source: 'fallback', paths: expectedFallback() });
    });
  }

  it('falls back when Claude does not answer within the time limit', async () => {
    const slowFetch = vi.fn(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const result = await handlePaths(validBody(), { env: { ANTHROPIC_API_KEY: FAKE_KEY }, fetchImpl: slowFetch, timeoutMs: 20 });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ source: 'fallback', paths: expectedFallback() });
    expect(slowFetch).toHaveBeenCalledTimes(1);
  });

  it('uses a 12 second limit by default', () => {
    expect(LLM_TIMEOUT_MS).toBe(12000);
  });

  const badRequests = {
    'no body': () => undefined,
    'a string that is not JSON': () => '{not json',
    'missing fields': () => ({ roles: validBody().roles }),
    'a non-string field': () => ({ ...validBody(), fields: { career: 1, now: '', pull: '' } }),
    'an oversized field': () => ({ ...validBody(), fields: { ...validBody().fields, career: 'x'.repeat(5000) } }),
    'two roles': () => ({ ...validBody(), roles: validBody().roles.slice(0, 2) }),
    'a duplicate role': () => {
      const roles = validBody().roles;
      roles[2] = { ...roles[0] };
      return { ...validBody(), roles };
    },
    'a role outside the catalog': () => {
      const roles = validBody().roles;
      roles[1] = { ...roles[1], id: 'astronaut' };
      return { ...validBody(), roles };
    },
    'a role with non-array transfers': () => {
      const roles = validBody().roles;
      roles[0] = { ...roles[0], transfers: 'all of them' };
      return { ...validBody(), roles };
    },
  };

  for (const [name, build] of Object.entries(badRequests)) {
    it(`rejects a request with ${name} with 400 and never calls fetch`, async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const res = await callHandler(build());
      expect(res.statusCode).toBe(400);
      expect(res.payload.error).toEqual({ code: expect.any(String), message: expect.any(String) });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  }

  it('accepts a JSON string body', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await callHandler(JSON.stringify(validBody()));
    expect(res.statusCode).toBe(200);
    expect(res.payload.source).toBe('fallback');
  });

  it('answers 405 for methods other than POST', async () => {
    const res = await callHandler(undefined, 'GET');
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe('POST');
    expect(res.payload.error.code).toBeTruthy();
  });

  it('keeps no API key in the function source', () => {
    const source = readFileSync(new URL('./paths.js', import.meta.url), 'utf8');
    const keyPrefix = new RegExp(['sk', 'ant'].join('-'));
    expect(source).not.toMatch(keyPrefix);
    expect(source).toContain('process.env.ANTHROPIC_API_KEY');
  });
});
