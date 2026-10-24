import { useMemo, useState } from 'react';
import * as logic from '@app/logic.js';
import persona from '@app/data/persona-dana.json';
import { staggerStyle } from '../motion';
import { useStore } from '../state/store';
import type { AppState, TraceEntry } from '../state/types';
import { brainSteps, useBrain } from '../brain/useBrain';
import BrainPanel from './BrainPanel';
import './Progress.css';

type LifelogItem = (typeof persona.lifelog)[number];

interface CheckinEvidence {
  type: 'checkin';
  actionId: string;
  kind: 'done' | 'not_today';
  day: string;
  weight: number;
}

interface LifelogEvidence {
  type: 'lifelog';
  id: string;
  date: string;
  source: string;
  title: string;
  weight: number;
}

type Evidence = CheckinEvidence | LifelogEvidence;

interface Signals {
  momentum: string;
  momentumScore: number;
  dropoutRisk: 'low' | 'medium' | 'high';
  daysShownUp: number;
  evidence: Evidence[];
  rules: { momentum: string; dropoutRisk: string; daysShownUp: string };
}

const SOURCE_LABEL: Record<string, string> = {
  note: 'Note',
  saved_link: 'Saved link',
  calendar: 'Calendar',
  sms: 'Text message',
  messenger: 'Messenger',
  document: 'Document',
  photo: 'Photo',
};

const VIA_LABEL: Record<NonNullable<TraceEntry['via']>, string> = {
  logic: 'Rule (logic.js)',
  llm: 'AI-drafted',
  fallback: 'Sample output (offline)',
  brain: 'Brain',
};

const tracedProgressSignals = logic.withTrace('progressSignals', logic.progressSignals);

// Lifelog items that were actually read in this session: only when the lifelog card
// was opened (lifelogConnected), and only the sources switched on.
export function connectedLifelog(state: AppState): LifelogItem[] {
  if (!state.lifelogConnected) return [];
  const enabled = new Set<string>(state.enabledSources);
  return persona.lifelog.filter((item) => enabled.has(item.source));
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : text;
}

// Momentum words in order; the level bar fills one segment per step (decoration only).
const MOMENTUM_LEVELS = ['starting', 'building', 'strong'];

const VIA_TAG: Record<NonNullable<TraceEntry['via']>, string> = {
  logic: 'tag',
  llm: 'tag tag-accent',
  fallback: 'tag tag-attention',
  brain: 'tag tag-ok',
};

function EvidenceText({ item, titles }: { item: Evidence; titles: Map<string, string> }) {
  if (item.type === 'checkin') {
    const title = titles.get(item.actionId) ?? item.actionId;
    const kind = item.kind === 'done' ? 'Done' : 'Not today (moved, kept)';
    return (
      <>
        <span className={`progress-tag tag${item.kind === 'done' ? ' tag-ok' : ''}`}>{kind}</span>{' '}
        <span className="progress-evidence-title">{title}</span>{' '}
        <span className="progress-muted progress-when">({item.day})</span>
      </>
    );
  }
  return (
    <>
      <span className="progress-tag tag">{SOURCE_LABEL[item.source] ?? item.source}</span>{' '}
      <span className="progress-evidence-title">{item.title}</span>{' '}
      <span className="progress-muted progress-when">({item.date})</span>
    </>
  );
}

export default function Progress() {
  const { state, dispatch } = useStore();
  const [showWhy, setShowWhy] = useState(false);

  const lifelog = useMemo(() => connectedLifelog(state), [state]);
  // One real progressSignals call; its trace is the last processing step in Why?.
  const { signals, signalsTrace } = useMemo(() => {
    const records = state.checkins.map((c) => ({ actionId: c.actionId, kind: c.kind, day: c.day }));
    const { result, trace } = tracedProgressSignals(records, lifelog);
    return { signals: result as Signals, signalsTrace: trace as TraceEntry };
  }, [state.checkins, lifelog]);

  const titles = useMemo(
    () => new Map((state.week?.actions ?? []).map((a) => [a.id, a.title] as [string, string])),
    [state.week],
  );
  const brain = useBrain(state);
  const steps: TraceEntry[] = [...state.trace, signalsTrace, ...brainSteps(brain)];
  const hasLifelogEvidence = signals.evidence.some((e) => e.type === 'lifelog');

  const level = Math.max(0, MOMENTUM_LEVELS.indexOf(signals.momentum));

  return (
    <section aria-label="Progress" className="progress">
      <div className="section-head">
        <span className="eyebrow" aria-hidden="true">
          Progress
        </span>
        <h2>Progress</h2>
      </div>

      <dl className="progress-signals">
        <div className="progress-signal progress-signal-wide" data-testid="signal-momentum" data-reveal style={staggerStyle(0, 60)}>
          <dt>Momentum</dt>
          <dd>
            <span className="progress-value">{capitalize(signals.momentum)}</span>{' '}
            <span className="progress-muted progress-score">(score {signals.momentumScore})</span>
          </dd>
          <span className="progress-level" aria-hidden="true">
            {MOMENTUM_LEVELS.map((name, i) => (
              <i key={name} className={i <= level ? 'is-on' : undefined} />
            ))}
          </span>
        </div>
        <div
          className="progress-signal"
          data-testid="signal-risk"
          data-risk={signals.dropoutRisk}
          data-reveal
          style={staggerStyle(1, 60)}
        >
          <dt>Drop-off risk</dt>
          <dd>
            <span className="progress-value">{capitalize(signals.dropoutRisk)}</span>
          </dd>
        </div>
        <div className="progress-signal" data-testid="signal-days" data-reveal style={staggerStyle(2, 60)}>
          <dt>Days you showed up</dt>
          <dd>
            <span className="progress-value">{signals.daysShownUp}</span>{' '}
            <span className="progress-muted progress-note">Days with any check-in. Not a streak.</span>
          </dd>
        </div>
      </dl>

      <BrainPanel view={brain} />

      <h3 className="progress-subhead">Evidence</h3>
      {state.checkins.length === 0 && (
        <p className="progress-muted progress-empty">No check-ins yet. Done or Not today both count.</p>
      )}
      {hasLifelogEvidence && <p className="progress-sim tag tag-sim">[SIMULATION] Sample persona: synthetic</p>}
      <ul className="progress-evidence" data-testid="evidence-list">
        {signals.evidence.map((item, i) => (
          <li key={`${item.type}-${i}`} data-reveal="sm" style={staggerStyle(i, 40, 120)}>
            <EvidenceText item={item} titles={titles} />
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="progress-button btn-secondary btn-sm"
        onClick={() => setShowWhy((v) => !v)}
      >
        <span className="roll">{showWhy ? 'Hide why' : 'Why?'}</span>
      </button>

      {showWhy && (
        <div className="progress-why anim-rise-sm" data-testid="why-panel">
          <h3 className="progress-subhead">Based on</h3>
          <ul className="progress-evidence">
            {signals.evidence.map((item, i) => (
              <li key={`why-${item.type}-${i}`} className="anim-rise-sm" style={staggerStyle(i, 40, 60)}>
                <EvidenceText item={item} titles={titles} />{' '}
                <span className="progress-muted progress-weight">(weight {item.weight})</span>
              </li>
            ))}
            {signals.evidence.length === 0 && <li className="progress-muted">Nothing recorded yet.</li>}
          </ul>
          <ul className="progress-rules card card-sm">
            <li>{signals.rules.momentum}</li>
            <li>{signals.rules.dropoutRisk}</li>
            <li>{signals.rules.daysShownUp}</li>
          </ul>

          <h3 className="progress-subhead">How it was worked out</h3>
          <p className="progress-muted progress-footnote">Only the steps that actually ran, in order.</p>
          <ol className="progress-steps" data-testid="why-steps">
            {steps.map((step, i) => {
              const via = step.via ?? 'logic';
              return (
                <li
                  key={`step-${i}`}
                  className="progress-step anim-rise-sm"
                  data-via={via}
                  style={staggerStyle(i, 60, 200)}
                >
                  <div className="progress-step-head">
                    <code data-testid="step-fn">{step.fn}</code>{' '}
                    <span className={`progress-tag ${VIA_TAG[via]}`}>{VIA_LABEL[via]}</span>
                  </div>
                  <div className="progress-io">
                    <span className="progress-muted">In:</span> {step.input}
                  </div>
                  <div className="progress-io">
                    <span className="progress-muted">Out:</span> {step.output}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {state.week && (
        <button
          type="button"
          className="progress-button progress-back btn-tertiary"
          onClick={() => dispatch({ type: 'go', screen: 'week' })}
        >
          <span className="roll">Back to this week</span>
        </button>
      )}
    </section>
  );
}
