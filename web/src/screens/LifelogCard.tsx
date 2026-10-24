import { useEffect, useRef } from 'react';
import { mergePrefill, summarizeLifelog, withTrace } from '@app/logic.js';
import persona from '@app/data/persona-dana.json';
import { useStore } from '../state/store';
import type { FieldKey, Fields, LifelogSource, TraceEntry } from '../state/types';
import './LifelogCard.css';

interface LifelogItem {
  id: string;
  date: string;
  source: string;
  title: string;
}

interface SourceInfo {
  label: string;
  icon: string;
  hint?: string;
}

// Display order follows the spec: on-by-default sources first, private ones after.
const SOURCE_ORDER: LifelogSource[] = ['note', 'saved_link', 'calendar', 'sms', 'messenger', 'document', 'photo'];

const SOURCES: Record<LifelogSource, SourceInfo> = {
  note: { label: 'Notes', icon: '\u{1F4DD}' },
  saved_link: { label: 'Saved links', icon: '\u{1F517}' },
  calendar: { label: 'Calendar', icon: '\u{1F4C5}' },
  sms: { label: 'Text messages', icon: '\u{1F4AC}', hint: 'Off by default for privacy' },
  messenger: { label: 'Messenger', icon: '\u{1F5E8}\u{FE0F}', hint: 'Off by default for privacy' },
  document: { label: 'Documents', icon: '\u{1F4C4}' },
  photo: { label: 'Photos', icon: '\u{1F5BC}\u{FE0F}' },
};

const SINGULAR: Record<LifelogSource, string> = {
  note: 'Note',
  saved_link: 'Saved link',
  calendar: 'Calendar event',
  sms: 'Text message',
  messenger: 'Messenger message',
  document: 'Document',
  photo: 'Photo',
};

const FIELD_LABELS: Record<FieldKey, string> = {
  career: 'Your career and what you did well',
  now: 'Where you are now and what worries you',
  pull: 'What pulls you (1 to 3 things)',
};

const FIELD_ORDER: FieldKey[] = ['career', 'now', 'pull'];

const ITEMS = persona.lifelog as LifelogItem[];

// Only offer toggles for sources that actually appear in the lifelog.
const PRESENT_SOURCES = SOURCE_ORDER.filter((source) => ITEMS.some((item) => item.source === source));

const tracedSummary = withTrace('summarizeLifelog', summarizeLifelog, {
  input: (items: unknown[], sources: string[]) => `${items.length} lifelog items, sources on: ${sources.join(', ') || 'none'}`,
});

export default function LifelogCard() {
  const { state, dispatch } = useStore();
  const enabled = new Set(state.enabledSources);

  // Run the summary for a source set, merge it around edited fields, and record the step.
  const prefillFrom = (sources: LifelogSource[], current: Fields, edited: Set<FieldKey>) => {
    const { result, trace } = tracedSummary(ITEMS, sources);
    const merged = mergePrefill(current, result, edited) as Fields;
    dispatch({ type: 'prefillFields', fields: merged });
    dispatch({ type: 'addTrace', entries: [trace as TraceEntry] });
  };

  // Prefill once when the card opens. The ref keeps StrictMode's double effect from
  // recording a second trace step that did not happen from the user's point of view.
  const didPrefill = useRef(false);
  useEffect(() => {
    if (didPrefill.current) return;
    didPrefill.current = true;
    dispatch({ type: 'connectLifelog' });
    prefillFrom(state.enabledSources, state.fields, state.editedFields);
    // Runs on mount only; later recomputes happen in the toggle handler.
  }, []);

  const toggle = (source: LifelogSource) => {
    const next = enabled.has(source)
      ? state.enabledSources.filter((s) => s !== source)
      : [...state.enabledSources, source];
    dispatch({ type: 'setEnabledSources', sources: next });
    prefillFrom(next, state.fields, state.editedFields);
  };

  const usedCount = ITEMS.filter((item) => enabled.has(item.source as LifelogSource)).length;

  return (
    <section aria-label="LifelogCard" className="lifelog">
      <h2>Connected data</h2>
      <p className="sim-label">[SIMULATION] Sample persona: synthetic</p>
      <p className="lifelog-intro">
        {persona.persona.name}, {persona.persona.role.toLowerCase()}. Choose which sources can shape your story.
      </p>

      <fieldset className="sources">
        <legend>Sources</legend>
        {PRESENT_SOURCES.map((source) => {
          const info = SOURCES[source];
          const on = enabled.has(source);
          return (
            <label key={source} className="source-toggle">
              <span className="source-name">
                <span aria-hidden="true">{info.icon}</span> {info.label}
                {info.hint ? <span className="source-hint">{info.hint}</span> : null}
              </span>
              <input type="checkbox" role="switch" checked={on} onChange={() => toggle(source)} />
            </label>
          );
        })}
      </fieldset>

      <div className="prefill">
        <h3>Your story so far</h3>
        <p className="prefill-note">Filled from the sources you turned on. Edit anything; your edits stay put.</p>
        {FIELD_ORDER.map((key) => (
          <label key={key} className="prefill-field">
            <span>{FIELD_LABELS[key]}</span>
            <textarea
              rows={4}
              value={state.fields[key]}
              onChange={(event) => dispatch({ type: 'editField', field: key, value: event.target.value })}
            />
          </label>
        ))}
      </div>

      <div className="items">
        <h3>Lifelog</h3>
        <p className="sim-label">
          [SIMULATION] 14 days of synthetic lifelog. {usedCount} of {ITEMS.length} items in use.
        </p>
        <ul aria-label="Lifelog items" className="item-list">
          {ITEMS.map((item) => {
            const source = item.source as LifelogSource;
            const on = enabled.has(source);
            return (
              <li key={item.id} className={on ? 'item' : 'item item-off'}>
                <span role="img" aria-label={SINGULAR[source] ?? item.source} className="item-icon">
                  {SOURCES[source]?.icon ?? '\u{2022}'}
                </span>
                <span className="item-body">
                  <span className="item-date">{item.date}</span>
                  <span className="item-title">{item.title}</span>
                </span>
                {on ? null : <span className="item-off-tag">Not used</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <button type="button" className="primary" onClick={() => dispatch({ type: 'go', screen: 'inputs' })}>
        Continue
      </button>
    </section>
  );
}
