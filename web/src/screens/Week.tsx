import { useState } from 'react';
import { applyCheckin, checkableActions, sizeForCondition, withTrace } from '@app/logic.js';
import persona from '@app/data/persona-dana.json';
import { useStore } from '../state/store';
import type { CheckinRecord, Day, Week as WeekState, WeekAction } from '../state/types';
import './Week.css';

// Week as produced by logic.buildWeek / applyCheckin (extra bookkeeping fields kept as-is).
type LogicWeek = WeekState & { pathTitle?: string; pendingComeback?: boolean; today?: string | null };

type ShownAction = WeekAction & { fullTitle: string; reduced: boolean };

interface ShareCard {
  pathTitle: string;
  actionTitle: string;
  progress: string;
  text: string;
}

interface Adjustment {
  restLine: string;
  reframe: string;
  tenMinute: string;
  movedLine: string;
}

interface CheckinResult {
  ok: boolean;
  week: LogicWeek;
  message: string;
  adjustment: Adjustment | null;
  shareCard: ShareCard | null;
  comeback: string | null;
}

// The demo "today" comes from the synthetic persona, never from the clock.
const DEMO_TODAY = persona.today as Day;
const CONDITIONS = [1, 2, 3, 4, 5];
// Progress starts at 1/4: choosing the path is the first step, each Done adds one.
const PROGRESS_STEPS = 4;

const tracedCheckin = withTrace('applyCheckin', applyCheckin, {
  input: (_week: unknown, actionId: string, kind: string, today: string) =>
    `action ${actionId}, ${kind}, today ${today}`,
  output: (r: CheckinResult) =>
    r.ok
      ? `${r.week.summary}${r.adjustment ? `; ${r.adjustment.movedLine}` : ''}${r.shareCard ? '; share card' : ''}${r.comeback ? '; comeback line' : ''}`
      : 'refused',
});

const tracedSize = withTrace('sizeForCondition', sizeForCondition, {
  input: (_week: unknown, condition: number) => `condition ${condition}`,
  output: (list: ShownAction[]) =>
    list.some((a) => a.reduced) ? `${list.length} actions, 10-minute versions` : `${list.length} actions, original size`,
});

function dayLabel(action: WeekAction): string {
  if (action.status === 'done') return 'Done';
  if (action.day === 'NextWeek') return 'Next week';
  if (action.status === 'moved') return `Moved to ${action.day}`;
  return action.day;
}

function CopyButton({ text }: { text: string }) {
  const [note, setNote] = useState('');
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(text);
      setNote('Copied.');
    } catch {
      setNote('Copy is not available here. Select the text above instead.');
    }
  };
  return (
    <>
      <button type="button" className="week-btn week-btn-quiet" onClick={() => void copy()}>
        Copy text
      </button>
      {note && <span className="week-note">{note}</span>}
    </>
  );
}

function Reply({ record }: { record: CheckinRecord }) {
  const adjustment = record.adjustment as Adjustment | null;
  const shareCard = record.shareCard as ShareCard | null;
  if (record.kind === 'not_today' && adjustment) {
    return (
      <div className="week-reply" role="status">
        <ul>
          <li className="week-reply-lead">{adjustment.restLine}</li>
          <li>{adjustment.reframe}</li>
          <li>{adjustment.tenMinute}</li>
          <li className="week-reply-moved">{adjustment.movedLine}</li>
        </ul>
      </div>
    );
  }
  const lines = record.message.split('\n').filter((line) => line && line !== record.comeback);
  return (
    <div className="week-reply" role="status">
      <ul>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
        {record.comeback && <li className="week-reply-lead">{record.comeback}</li>}
      </ul>
      {shareCard && (
        <section className="week-share" aria-label="Share card">
          <p className="week-share-path">{shareCard.pathTitle}</p>
          <p>Just did: {shareCard.actionTitle}</p>
          <p className="week-share-progress">{shareCard.progress}</p>
          <CopyButton text={shareCard.text} />
        </section>
      )}
    </div>
  );
}

export default function Week() {
  const { state, dispatch } = useStore();
  const week = state.week as LogicWeek | null;

  if (!week) {
    return (
      <section aria-label="Week" className="week">
        <h2>This week</h2>
        <p>No path chosen yet.</p>
        <button type="button" className="week-btn" onClick={() => dispatch({ type: 'go', screen: 'paths' })}>
          Choose a path
        </button>
      </section>
    );
  }

  const role = state.rankedRoles.find((r) => r.id === state.chosenPathId);
  const pathTitle = week.pathTitle || role?.title || '';
  const draft = state.paths?.paths.find((p) => p.role_id === state.chosenPathId);
  const shown = sizeForCondition(week, state.condition) as ShownAction[];
  const checkable = new Set((checkableActions(week) as WeekAction[]).map((a) => a.id));
  const doneCount = week.actions.filter((a) => a.status === 'done').length;
  const progress = Math.min(PROGRESS_STEPS, 1 + doneCount);
  const lastRecord = state.checkins.length > 0 ? state.checkins[state.checkins.length - 1] : null;
  const reduced = state.condition === 1 || state.condition === 2;

  const checkin = (actionId: string, kind: 'done' | 'not_today') => {
    // The share card names the path even when the week was built without a title.
    const input: LogicWeek = { ...week, pathTitle };
    const { result, trace } = tracedCheckin(input, actionId, kind, DEMO_TODAY) as {
      result: CheckinResult;
      trace: { fn: string; input: string; output: string; via: 'logic' };
    };
    if (!result.ok) return;
    dispatch({ type: 'setWeek', week: result.week });
    dispatch({
      type: 'addCheckin',
      record: {
        actionId,
        kind,
        day: DEMO_TODAY,
        message: result.message,
        adjustment: result.adjustment,
        shareCard: result.shareCard,
        comeback: result.comeback,
      },
    });
    dispatch({ type: 'addTrace', entries: [trace] });
  };

  const chooseCondition = (condition: number) => {
    dispatch({ type: 'setCondition', condition });
    const { trace } = tracedSize(week, condition) as {
      trace: { fn: string; input: string; output: string; via: 'logic' };
    };
    dispatch({ type: 'addTrace', entries: [trace] });
  };

  return (
    <section aria-label="Week" className="week">
      <h2>This week</h2>
      {pathTitle && <p className="week-path">{pathTitle}</p>}

      {draft?.arc_12w && (
        <details className="week-arc">
          <summary>12-week arc</summary>
          <p>{draft.arc_12w}</p>
        </details>
      )}

      <div className="week-progress">
        <div
          className="week-progress-bar"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={PROGRESS_STEPS}
          aria-valuenow={progress}
        >
          <span style={{ width: `${(progress / PROGRESS_STEPS) * 100}%` }} />
        </div>
        <span className="week-progress-text">Progress {progress}/{PROGRESS_STEPS}</span>
      </div>

      <fieldset className="week-condition">
        <legend>How is your energy today? (1 low, 5 high)</legend>
        <div className="week-condition-row">
          {CONDITIONS.map((c) => (
            <button
              key={c}
              type="button"
              className="week-condition-btn"
              aria-label={`Condition ${c}`}
              aria-pressed={state.condition === c}
              onClick={() => chooseCondition(c)}
            >
              {c}
            </button>
          ))}
        </div>
        {reduced && <p className="week-note">Showing the 10-minute version of each action.</p>}
      </fieldset>

      <ol className="week-actions">
        {shown.map((action) => (
          <li key={action.id} className={`week-action week-action-${action.status}`} data-testid={`action-${action.id}`}>
            <p className="week-action-title">{action.title}</p>
            <p className="week-action-meta">
              <span>{dayLabel(action)}</span> · <span>{action.minutes} min</span>
            </p>
            {checkable.has(action.id) && (
              <div className="week-action-buttons">
                <button type="button" className="week-btn" onClick={() => checkin(action.id, 'done')}>
                  Done
                </button>
                <button type="button" className="week-btn week-btn-quiet" onClick={() => checkin(action.id, 'not_today')}>
                  Not today
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>

      <p className="week-summary">{week.summary}</p>

      {lastRecord && <Reply key={state.checkins.length} record={lastRecord} />}

      <div className="week-footer">
        <button type="button" className="week-btn week-btn-quiet" onClick={() => dispatch({ type: 'go', screen: 'paths' })}>
          Change path
        </button>
        <button type="button" className="week-btn week-btn-quiet" onClick={() => dispatch({ type: 'go', screen: 'progress' })}>
          See progress
        </button>
      </div>
    </section>
  );
}
