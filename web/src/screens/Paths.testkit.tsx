// Test-only harness for the P0 screens: renders the current screen from the store
// and exposes the latest state. The lifelog card is a stand-in with a Continue button
// that marks the lifelog as connected, as the real card does when it opens.
import persona from '@app/data/persona-dana.json';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { StoreProvider, useStore } from '../state/store';
import type { AppState, PathDraft } from '../state/types';
import Inputs from './Inputs';
import Landing from './Landing';
import Paths from './Paths';

export const current: { state: AppState | null } = { state: null };

function LifelogStandIn() {
  const { dispatch } = useStore();
  return (
    <button
      type="button"
      onClick={() => {
        dispatch({ type: 'connectLifelog' });
        dispatch({ type: 'go', screen: 'inputs' });
      }}
    >
      Continue (test)
    </button>
  );
}

function Router() {
  const { state } = useStore();
  current.state = state;
  switch (state.screen) {
    case 'landing':
      return <Landing />;
    case 'lifelog':
      return <LifelogStandIn />;
    case 'inputs':
      return <Inputs />;
    case 'paths':
      return <Paths />;
    default:
      return <p>{`screen:${state.screen}`}</p>;
  }
}

export function renderFlow(initialState?: AppState) {
  return render(
    <StoreProvider initialState={initialState}>
      <Router />
    </StoreProvider>,
  );
}

export function state(): AppState {
  if (!current.state) throw new Error('harness not rendered');
  return current.state;
}

export const FALLBACK = persona.fallback.paths as unknown as PathDraft[];

// A well-formed LLM answer for every catalog role, with recognisable one-liners.
export function llmPaths(): PathDraft[] {
  return FALLBACK.map((p) => ({ ...p, one_liner: `LLM line for ${p.role_id}` }));
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function stubFetch(impl: (input: string, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}
