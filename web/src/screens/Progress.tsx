import { useMemo, useState } from 'react';
import * as logic from '@app/logic.js';
import persona from '@app/data/persona-dana.json';
import { useStore } from '../state/store';
import type { AppState, TraceEntry } from '../state/types';
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

function EvidenceText({ item, titles }: { item: Evidence; titles: Map<string, string> }) {
  if (item.type === 'checkin') {
    const title = titles.get(item.actionId) ?? item.actionId;
    const kind = item.kind === 'done' ? 'Done' : 'Not today (moved, kept)';
    return (
      <>
        <span className="progress-tag">{kind}</span> {title} <span className="progress-muted">({item.day})</span>
      </>
    );
  }
  return (
    <>
      <span className="progress-tag">{SOURCE_LABEL[item.source] ?? item.source}</span> {item.title}{' '}
      <span className="progress-muted">({item.date})</span>
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
  const steps: TraceEntry[] = [...state.trace, signalsTrace];
  const hasLifelogEvidence = signals.evidence.some((e) => e.type === 'lifelog');

  return (
    <section aria-label="Progress" className="progress">
      <h2>Progress</h2>

      <dl className="progress-signals">
        <div className="progress-signal" data-testid="signal-momentum">
          <dt>Momentum</dt>
          <dd>
            {capitalize(signals.momentum)} <span className="progress-muted">(score {signals.momentumScore})</span>
          </dd>
        </div>
        <div className="progress-signal" data-testid="signal-risk">
          <dt>Drop-off risk</dt>
          <dd>{capitalize(signals.dropoutRisk)}</dd>
        </div>
        <div className="progress-signal" data-testid="signal-days">
          <dt>Days you showed up</dt>
          <dd>
            {signals.daysShownUp} <span className="progress-muted">Days with any check-in. Not a streak.</span>
          </dd>
        </div>
      </dl>

      <h3>Evidence</h3>
      {state.checkins.length === 0 && <p className="progress-muted">No check-ins yet. Done or Not today both count.</p>}
      {hasLifelogEvidence && <p className="progress-sim">[SIMULATION] Sample persona: synthetic</p>}
      <ul className="progress-evidence" data-testid="evidence-list">
        {signals.evidence.map((item, i) => (
          <li key={`${item.type}-${i}`}>
            <EvidenceText item={item} titles={titles} />
          </li>
        ))}
      </ul>

      <button type="button" className="progress-button" onClick={() => setShowWhy((v) => !v)}>
        {showWhy ? 'Hide why' : 'Why?'}
      </button>

      {showWhy && (
        <div className="progress-why" data-testid="why-panel">
          <h3>Based on</h3>
          <ul className="progress-evidence">
            {signals.evidence.map((item, i) => (
              <li key={`why-${item.type}-${i}`}>
                <EvidenceText item={item} titles={titles} />{' '}
                <span className="progress-muted">(weight {item.weight})</span>
              </li>
            ))}
            {signals.evidence.length === 0 && <li className="progress-muted">Nothing recorded yet.</li>}
          </ul>
          <ul className="progress-rules">
            <li>{signals.rules.momentum}</li>
            <li>{signals.rules.dropoutRisk}</li>
            <li>{signals.rules.daysShownUp}</li>
          </ul>

          <h3>How it was worked out</h3>
          <p className="progress-muted">Only the steps that actually ran, in order.</p>
          <ol className="progress-steps" data-testid="why-steps">
            {steps.map((step, i) => (
              <li key={`step-${i}`} className="progress-step">
                <div>
                  <code data-testid="step-fn">{step.fn}</code>{' '}
                  <span className="progress-tag">{VIA_LABEL[step.via ?? 'logic']}</span>
                </div>
                <div className="progress-io">
                  <span className="progress-muted">In:</span> {step.input}
                </div>
                <div className="progress-io">
                  <span className="progress-muted">Out:</span> {step.output}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {state.week && (
        <button type="button" className="progress-button" onClick={() => dispatch({ type: 'go', screen: 'week' })}>
          Back to this week
        </button>
      )}
    </section>
  );
}
