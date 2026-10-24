import persona from '@app/data/persona-dana.json';
import * as logic from '@app/logic.js';
import { useState } from 'react';
import { resolvePaths, type FetchPathsOptions } from '../api/paths';
import { useStore } from '../state/store';
import type {
  FieldKey,
  Fields,
  LifelogSource,
  PathsResponse,
  RankedRole,
  TraceEntry,
} from '../state/types';
import './Landing.css';
import { SIMULATION_LABEL } from './Landing';

export const FIELD_LABELS: Record<FieldKey, { label: string; placeholder: string }> = {
  career: {
    label: 'Career and what you were good at',
    placeholder: 'What you did, for whom, and what people kept you for.',
  },
  now: {
    label: "Where you are now and what's bothering you",
    placeholder: 'What changed, what you tried, what worries you.',
  },
  pull: {
    label: 'What pulls you (1 to 3 things)',
    placeholder: 'The parts of the work you enjoy, or something you keep reading about.',
  },
};

const FIELD_ORDER: FieldKey[] = ['career', 'now', 'pull'];

interface LifelogItem {
  id: string;
  source: string;
  title: string;
  summary: string;
  tags: string[];
}

export interface ShowPathsResult {
  rankedRoles: RankedRole[];
  paths: PathsResponse;
  trace: TraceEntry[];
}

// The P0 pipeline behind "Show my paths". Judgments come only from logic.js
// (extractSkills, rankRoles); the server or the sample fallback only writes sentences.
// Every step that ran adds one trace entry, in call order.
export async function showPaths(
  fields: Fields,
  enabledSources: LifelogSource[],
  options: FetchPathsOptions = {},
): Promise<ShowPathsResult> {
  const enabled = new Set<string>(enabledSources);
  const items = (persona.lifelog as LifelogItem[]).filter((item) => enabled.has(item.source));

  const skillsStep = logic.withTrace('extractSkills', logic.extractSkills, {
    input: () =>
      `fields: ${FIELD_ORDER.filter((k) => fields[k].trim() !== '').length}/3 filled; lifelog: ${items.length} items from ${
        enabledSources.length > 0 ? enabledSources.join(', ') : 'no sources'
      }; skills dictionary: ${persona.skills.length}`,
    output: (ids: string[]) => `${ids.length} skills: ${ids.join(', ')}`,
  })(fields, items, persona.skills);
  const userSkills = skillsStep.result as string[];

  const rankStep = logic.withTrace('rankRoles', logic.rankRoles, {
    input: () => `${userSkills.length} skills vs ${persona.roles.length} roles`,
    output: (roles: RankedRole[]) =>
      roles.map((r) => `${r.id} ${Math.round(r.ratio * 100)}%`).join(', '),
  })(userSkills, persona.roles);
  const rankedRoles = rankStep.result as RankedRole[];

  const request = {
    fields: { career: fields.career, now: fields.now, pull: fields.pull },
    roles: rankedRoles.map((r) => ({
      id: r.id,
      title: r.title,
      transfers: [...r.transfers],
      missing: [...r.missing],
    })),
  };
  const resolved = await resolvePaths(request, options);
  const pathsTrace: TraceEntry = {
    fn: 'POST /api/paths',
    input: `${request.roles.length} roles: ${request.roles.map((r) => r.id).join(', ')}`,
    output: `source ${resolved.response.source}, ${resolved.response.paths.length} paths (${resolved.note})`,
    via: resolved.response.source,
  };

  return {
    rankedRoles,
    paths: resolved.response,
    trace: [skillsStep.trace as TraceEntry, rankStep.trace as TraceEntry, pathsTrace],
  };
}

export default function Inputs() {
  const { state, dispatch } = useStore();
  const [busy, setBusy] = useState(false);

  // Prefilled text only ever comes from the synthetic persona or its lifelog.
  const showsSample = FIELD_ORDER.some(
    (k) => state.fields[k].trim() !== '' && !state.editedFields.has(k),
  );
  const canSubmit = !busy && FIELD_ORDER.some((k) => state.fields[k].trim() !== '');

  const onShowPaths = async () => {
    setBusy(true);
    try {
      // Lifelog items count only when the user went through the lifelog card.
      const sources = state.lifelogConnected ? state.enabledSources : [];
      const result = await showPaths(state.fields, sources);
      dispatch({ type: 'setRankedRoles', roles: result.rankedRoles });
      dispatch({ type: 'setPaths', paths: result.paths });
      dispatch({ type: 'addTrace', entries: result.trace });
      dispatch({ type: 'go', screen: 'paths' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Inputs" className="p0">
      <h2>Tell your story</h2>
      {showsSample && <p className="p0-tag">{SIMULATION_LABEL}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) void onShowPaths();
        }}
      >
        {FIELD_ORDER.map((key) => (
          <label key={key} className="p0-field">
            <span>{FIELD_LABELS[key].label}</span>
            <textarea
              name={key}
              rows={5}
              value={state.fields[key]}
              placeholder={FIELD_LABELS[key].placeholder}
              onChange={(e) => dispatch({ type: 'editField', field: key, value: e.target.value })}
            />
          </label>
        ))}
        <button type="submit" className="p0-primary" disabled={!canSubmit}>
          {busy ? 'Drafting your paths...' : 'Show my paths'}
        </button>
      </form>
    </section>
  );
}
