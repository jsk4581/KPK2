import persona from '@app/data/persona-dana.json';
import * as logic from '@app/logic.js';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RankedRole } from '../state/types';
import { SOURCE_LABELS } from './Paths';
import { FALLBACK, jsonResponse, llmPaths, renderFlow, state, stubFetch } from './Paths.testkit';

afterEach(() => {
  vi.unstubAllGlobals();
});

// What logic.js decides for Dana with the default sources (note, saved_link, calendar).
function expectedRoles(): RankedRole[] {
  const enabled = new Set(['note', 'saved_link', 'calendar']);
  const items = persona.lifelog.filter((i) => enabled.has(i.source));
  const skills = logic.extractSkills(persona.fields, items, persona.skills) as string[];
  return logic.rankRoles(skills, persona.roles) as RankedRole[];
}

async function toPaths() {
  renderFlow();
  fireEvent.click(screen.getByRole('button', { name: 'Load sample persona' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue (test)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Show my paths' }));
  await waitFor(() => expect(state().screen).toBe('paths'));
}

function cards() {
  return screen.getAllByRole('article');
}

describe('Paths', () => {
  it('LLM answer: three cards in logic.js rank order, labelled AI-drafted', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ source: 'llm', paths: llmPaths() }));
    await toPaths();
    const roles = expectedRoles();
    expect(roles).toHaveLength(3);

    const shown = cards();
    expect(shown).toHaveLength(3);
    shown.forEach((card, i) => {
      const role = roles[i];
      expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(role.title);
      expect(within(card).getByText(`LLM line for ${role.id}`)).toBeInTheDocument();
      expect(within(card).getByText('What carries over')).toBeInTheDocument();
      expect(within(card).getByText("What you'd need to build")).toBeInTheDocument();
      expect(within(card).getByText("How you'd start")).toBeInTheDocument();
      expect(within(card).getByText(`${Math.round(role.ratio * 100)}% skill match`)).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: 'Choose this path' })).toBeInTheDocument();
    });
    expect(screen.getByText(SOURCE_LABELS.llm)).toBeInTheDocument();
    expect(screen.queryByText(SOURCE_LABELS.fallback)).not.toBeInTheDocument();

    // One POST with the three fields and the three ranked roles.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/paths');
    expect(init?.method).toBe('POST');
    const body = JSON.parse(String(init?.body));
    expect(body.fields).toEqual(persona.fields);
    expect(body.roles).toEqual(
      roles.map((r) => ({ id: r.id, title: r.title, transfers: r.transfers, missing: r.missing })),
    );

    // Trace holds exactly the steps that ran, in order.
    expect(state().trace.map((t) => [t.fn, t.via])).toEqual([
      ['extractSkills', 'logic'],
      ['rankRoles', 'logic'],
      ['POST /api/paths', 'llm'],
    ]);
    expect(state().rankedRoles).toEqual(roles);
  });

  it('the LLM never changes which roles are shown, even when it drafts other roles', async () => {
    const roles = expectedRoles();
    const others = llmPaths().filter((p) => !roles.some((r) => r.id === p.role_id));
    stubFetch(async () => jsonResponse({ source: 'llm', paths: others }));
    await toPaths();
    expect(cards().map((c) => within(c).getByRole('heading', { level: 3 }).textContent)).toEqual(
      roles.map((r) => r.title),
    );
    expect(screen.getByText(SOURCE_LABELS.fallback)).toBeInTheDocument();
  });

  it.each([
    ['network error', async () => Promise.reject(new TypeError('Failed to fetch'))],
    ['server error status', async () => jsonResponse({ error: { code: 'x', message: 'y' } }, 500)],
    ['bad request status', async () => jsonResponse({ error: { code: 'bad_request', message: 'y' } }, 400)],
    ['malformed LLM answer', async () => jsonResponse({ source: 'llm', paths: [{ role_id: 'x' }] })],
    ['not JSON', async () => new Response('<html>oops</html>', { status: 200 })],
  ])('%s: browser falls back to the sample output and says so', async (_name, impl) => {
    stubFetch(impl);
    await toPaths();
    const roles = expectedRoles();
    const shown = cards();
    expect(shown).toHaveLength(3);
    shown.forEach((card, i) => {
      const fallback = FALLBACK.find((p) => p.role_id === roles[i].id);
      expect(within(card).getByText(fallback!.one_liner)).toBeInTheDocument();
    });
    expect(screen.getByText(SOURCE_LABELS.fallback)).toBeInTheDocument();
    expect(screen.queryByText(SOURCE_LABELS.llm)).not.toBeInTheDocument();
    expect(state().paths?.source).toBe('fallback');
    expect(state().trace.at(-1)).toMatchObject({ fn: 'POST /api/paths', via: 'fallback' });
  });

  it('server fallback answer is labelled Sample result', async () => {
    stubFetch(async () => jsonResponse({ source: 'fallback', paths: FALLBACK }));
    await toPaths();
    expect(screen.getByText('Sample result')).toBeInTheDocument();
  });

  it('Choose this path builds the week with logic.buildWeek and opens This week', async () => {
    stubFetch(async () => jsonResponse({ source: 'llm', paths: llmPaths() }));
    await toPaths();
    const roles = expectedRoles();
    fireEvent.click(within(cards()[1]).getByRole('button', { name: 'Choose this path' }));

    expect(state().screen).toBe('week');
    expect(state().chosenPathId).toBe(roles[1].id);
    const week = state().week!;
    const draft = llmPaths().find((p) => p.role_id === roles[1].id)!;
    expect(week).toEqual(logic.buildWeek({ ...draft, title: roles[1].title }, persona.today));
    expect(week.actions).toHaveLength(3);
    expect(week.actions.every((a) => a.status === 'todo' && a.moves === 0 && a.minutes <= 30)).toBe(true);
    expect(week.summary).toBe('0/3 done');
    expect(state().checkins).toEqual([]);
    expect(state().trace.at(-1)).toMatchObject({ fn: 'buildWeek', via: 'logic' });
  });

  it('without paths it offers a way back to the inputs', () => {
    renderFlow({ ...stateAt('paths') });
    expect(screen.getByText('No paths yet. Fill in your story first.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit my story' }));
    expect(state().screen).toBe('inputs');
  });

  it('uses no failure wording and no red warning colors', async () => {
    stubFetch(async () => Promise.reject(new TypeError('Failed to fetch')));
    await toPaths();
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/\bfail(ed|ure)?\b/i);
    expect(text).not.toMatch(/\bmissed\b/i);

    // vitest runs from web/, so the stylesheet is read straight from disk.
    const css = readFileSync(resolve(process.cwd(), 'src/screens/Landing.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toContain('.p0-primary');
    expect(css).not.toMatch(/\bred\b|crimson|tomato|firebrick/i);
    for (const [, hex] of css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
      const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
      expect(r > g + 60 && r > b + 60, `#${hex} is red-ish`).toBe(false);
    }
  });
});

function stateAt(screenName: 'paths') {
  return {
    screen: screenName,
    fields: { career: '', now: '', pull: '' },
    editedFields: new Set<'career' | 'now' | 'pull'>(),
    enabledSources: ['note' as const, 'saved_link' as const, 'calendar' as const],
    lifelogConnected: true,
    rankedRoles: [],
    paths: null,
    chosenPathId: null,
    week: null,
    condition: null,
    checkins: [],
    trace: [],
  };
}
