import persona from '@app/data/persona-dana.json';
import { describe, expect, it } from 'vitest';
import {
  fallbackPaths,
  isValidPathDraft,
  resolvePaths,
  selectPaths,
  type PathsRequest,
} from '../api/paths';
import { FALLBACK, jsonResponse, llmPaths } from './Paths.testkit';

const ROLE_IDS = ['copy-educator', 'messaging-consultant', 'ux-writer'];
const REQUEST: PathsRequest = {
  fields: { ...persona.fields },
  roles: ROLE_IDS.map((id) => ({ id, title: id, transfers: [], missing: [] })),
};

describe('api/paths', () => {
  it('fallbackPaths covers the asked roles in order and is labelled fallback', () => {
    const res = fallbackPaths(ROLE_IDS);
    expect(res.source).toBe('fallback');
    expect(res.paths.map((p) => p.role_id)).toEqual(ROLE_IDS);
    expect(res.paths.every(isValidPathDraft)).toBe(true);
  });

  it('every role in the catalog has a valid sample path', () => {
    const ids = persona.roles.map((r) => r.id);
    expect(selectPaths(FALLBACK, ids)).not.toBeNull();
  });

  it('selectPaths keeps the ranked order and refuses incomplete answers', () => {
    expect(selectPaths(llmPaths(), ROLE_IDS)?.map((p) => p.role_id)).toEqual(ROLE_IDS);
    expect(selectPaths(llmPaths().slice(0, 1), ROLE_IDS)).toBeNull();
    expect(selectPaths('nope', ROLE_IDS)).toBeNull();
  });

  it('isValidPathDraft rejects actions over 30 minutes, NextWeek days and fewer than 3 actions', () => {
    const base = llmPaths()[0];
    const withAction = (patch: object) => ({
      ...base,
      week: { actions: base.week.actions.map((a, i) => (i === 0 ? { ...a, ...patch } : a)) },
    });
    expect(isValidPathDraft(base)).toBe(true);
    expect(isValidPathDraft(withAction({ minutes: 45 }))).toBe(false);
    expect(isValidPathDraft(withAction({ day: 'NextWeek' }))).toBe(false);
    expect(isValidPathDraft(withAction({ short: '' }))).toBe(false);
    expect(isValidPathDraft({ ...base, week: { actions: base.week.actions.slice(0, 2) } })).toBe(false);
    expect(isValidPathDraft({ ...base, one_liner: '' })).toBe(false);
  });

  it('valid LLM answer -> source llm, trimmed to the asked roles', async () => {
    const out = await resolvePaths(REQUEST, {
      fetchImpl: async () => jsonResponse({ source: 'llm', paths: llmPaths() }),
    });
    expect(out.response.source).toBe('llm');
    expect(out.response.paths.map((p) => p.role_id)).toEqual(ROLE_IDS);
  });

  it('a server that never answers is cut off by the browser timeout and falls back', async () => {
    const hanging = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    const out = await resolvePaths(REQUEST, { fetchImpl: hanging, timeoutMs: 20 });
    expect(out.response).toEqual(fallbackPaths(ROLE_IDS));
    expect(out.note).toMatch(/unreachable/);
  });

  it('a server fallback missing a role is replaced by the local sample output', async () => {
    const out = await resolvePaths(REQUEST, {
      fetchImpl: async () => jsonResponse({ source: 'fallback', paths: FALLBACK.slice(0, 1) }),
    });
    expect(out.response).toEqual(fallbackPaths(ROLE_IDS));
  });
});
