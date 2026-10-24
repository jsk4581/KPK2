import type { ThinkOutput } from '../api/brain';
import { SCENARIO_ID_PREFIX } from '../brain/adapter';
import { MIN_DATA_DAYS, dataDays, riskMeasured } from '../brain/dataDays';
import type { BrainView } from '../brain/useBrain';
import { valueLabel } from '../brain/layers';
import './BrainPanel.css';

// Decision brain section of the Progress tab ("Where you stand", labelled rules-based). Shows what the rules-only brain server
// returned; while it is unreachable the on-device signals above stay as they are.

const RISK_WORD: Record<string, string> = { green: 'Low', amber: 'Medium', red: 'High' };

const RISK_REASON: Record<string, string> = {
  gap_days: 'A few days since anything was logged',
  consec_rest: 'Two or more Not today in a row',
  low_momentum: 'Momentum is low',
  low_condition: 'Energy has been low the last 3 days',
  low_self_efficacy: 'Fewer steps finished than tried lately',
  first_week: 'First week of the 12-week plan',
  data_gap: 'No new activity for 2 or more days',
};

// Plain names for the brain's milestone ids (UI only; the brain keeps its ids and names).
const MILESTONE_NAME: Record<string, string> = {
  M1: 'First sign this path fits',
  M2: 'Proof your past work carries over',
  M3: 'First contact with the market',
  M4: 'Ready to apply or pitch',
};

const CONSTRAINT_NAME: Record<string, string> = {
  capability: 'Skill',
  'opportunity-time': 'Time',
  'opportunity-social': 'Other people',
  'motivation-reflective': 'Reasons to keep going',
  'motivation-automatic': 'Energy and mood',
  unknown: 'Not named yet',
};

const CONSTRAINT_TOPIC: Record<string, string> = {
  capability: 'not knowing how yet',
  'opportunity-time': 'time',
  'opportunity-social': 'waiting on other people',
  'motivation-reflective': 'doubts about the direction',
  'motivation-automatic': 'energy or mood',
};

const UNKNOWN_WHY: Record<string, string> = {
  no_reasons: 'No Not today reason was tapped yet, so nothing is guessed.',
  tie: 'Two reasons are tied, so neither is picked.',
  reasons_unknown: 'The reasons given do not point to one thing.',
};

export function energyWord(energy: number | null | undefined): string {
  if (typeof energy !== 'number') return 'Not reported';
  if (energy <= 1) return 'Very low';
  if (energy === 2) return 'Low';
  if (energy === 3) return 'Okay';
  if (energy === 4) return 'Good';
  return 'High';
}

export const NOT_ENOUGH = 'Not enough data';

// `days` = days of data behind the value (see brain/dataDays.ts); fewer than MIN_DATA_DAYS
// means the value is still mostly the brain's starting point, not a measurement.
export function momentumWord(momentum: number | null | undefined, days = MIN_DATA_DAYS): string {
  if (typeof momentum !== 'number' || days < MIN_DATA_DAYS) return NOT_ENOUGH;
  if (momentum >= 0.65) return 'Strong';
  if (momentum >= 0.35) return 'Building';
  return 'Slow';
}

export function efficacyWord(value: number | null | undefined, days = MIN_DATA_DAYS): string {
  if (typeof value !== 'number' || days < MIN_DATA_DAYS) return NOT_ENOUGH;
  if (value >= 0.7) return 'Solid';
  if (value >= 0.4) return 'Growing';
  return 'Still forming';
}

function DaysSoFar({ days }: { days: number }) {
  if (days >= MIN_DATA_DAYS) return null;
  return (
    <span className="brain-muted">
      {' '}
      ({days} of {MIN_DATA_DAYS} days so far)
    </span>
  );
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// The on-device signals above the panel and the brain both name a momentum and a risk of
// stalling. They read different inputs, so the panel says which inputs each one used.
function ScopeNote({ context }: { context: ThinkOutput['context'] }) {
  const checkins = context?.checkinCount;
  const lifelog = context?.lifelogCount;
  const counts =
    typeof checkins === 'number' && typeof lifelog === 'number'
      ? `${plural(checkins, 'check-in')} and ${plural(lifelog, 'activity item')}`
      : 'the check-ins and activity items sent to it';
  return (
    <p className="brain-muted brain-scope" data-testid="brain-scope">
      Why these can differ from the signals above: those count this week&apos;s check-ins on this device only.
      These rules read {counts}, day by day, so their momentum and risk of stalling can come out different.
    </p>
  );
}

function constraintWhy(constraint: ThinkOutput['constraint']): string {
  const id = constraint.constraint;
  if (id === 'unknown' || !CONSTRAINT_TOPIC[id]) {
    return UNKNOWN_WHY[constraint.reason ?? ''] ?? 'Nothing points to one thing yet.';
  }
  const signals = constraint.signals ?? [];
  const here = signals.filter((s) => s.constraint === id).length;
  const score = typeof constraint.score === 'number' ? ` (weighted score ${constraint.score})` : '';
  return `${here} of ${signals.length} recent Not today reasons point to ${CONSTRAINT_TOPIC[id]}${score}.`;
}

function suggestion(intervention: ThinkOutput['intervention']): { title: string; minutes: number } {
  if (intervention.kind === 'none' || !intervention.action) {
    return { title: intervention.choices?.[0] ?? 'Rest today', minutes: 0 };
  }
  const slots = intervention.slots ?? {};
  const micro = intervention.variant === 'micro' && typeof slots.micro_title === 'string' ? slots.micro_title : null;
  const full = typeof slots.action === 'string' ? slots.action : null;
  return { title: micro ?? full ?? intervention.action.title ?? intervention.action.id ?? '', minutes: intervention.minutes };
}

function BrainData({ data }: { data: ThinkOutput }) {
  const { state, goal, constraint, monitor, intervention, labels } = data;
  const days = dataDays(state);
  const measured = riskMeasured(state, days);
  const level = measured ? state.risk.level : 'unknown';
  const attention = level === 'amber' || level === 'red';
  const next = goal.milestones.find((m) => m.passed !== true) ?? null;
  // The app's own words first; the server's labels only where the app has none for an id.
  const nextName = next ? (MILESTONE_NAME[next.id] ?? valueLabel(labels, 'goal.milestones.id', next.id) ?? undefined) : undefined;
  const todo = suggestion(intervention);
  // Drift about this week's plan only: notes tied to an action of the server's synthetic
  // history (ids prefixed by the adapter) are not about the user's week.
  const drift = monitor.drift.filter(
    (d) => typeof d.note === 'string' && d.note !== '' && !(d.actionId ?? '').startsWith(SCENARIO_ID_PREFIX),
  );

  return (
    <>
      <ScopeNote context={data.context} />
      <dl className="brain-grid">
        <div className="brain-cell" data-testid="brain-energy">
          <dt>Energy</dt>
          <dd>{energyWord(state.energy)}</dd>
        </div>
        <div className="brain-cell" data-testid="brain-momentum">
          <dt>Momentum</dt>
          <dd>
            {momentumWord(state.momentum, days.logged)}
            <DaysSoFar days={days.logged} />
          </dd>
        </div>
        <div className="brain-cell" data-testid="brain-efficacy">
          <dt>Confidence</dt>
          <dd>
            {efficacyWord(state.selfEfficacy, days.checkins)}
            <DaysSoFar days={days.checkins} />
          </dd>
        </div>
        <div className={`brain-cell${attention ? ' brain-attention' : ''}`} data-testid="brain-risk" data-level={level}>
          <dt>Risk of stalling</dt>
          <dd>{measured ? (RISK_WORD[level] ?? valueLabel(labels, 'state.risk.level', level) ?? level) : NOT_ENOUGH}</dd>
        </div>
      </dl>
      {state.risk.reasons.length > 0 && (
        <ul className="brain-reasons" data-testid="brain-risk-reasons">
          {state.risk.reasons.map((r) => (
            <li key={r}>{RISK_REASON[r] ?? r}</li>
          ))}
        </ul>
      )}

      {next && (
        <div className="brain-block" data-testid="brain-milestone">
          <h4>Next milestone</h4>
          <p>
            <strong>{nextName ?? [next.id, next.name].filter(Boolean).join(' ')}</strong>
            {next.date && <span className="brain-muted"> by {next.date}</span>}
          </p>
          {!nextName && next.outcome && <p>{next.outcome}</p>}
          {next.evidence && <p className="brain-muted">Evidence: {next.evidence}</p>}
        </div>
      )}

      <div className="brain-block" data-testid="brain-constraint">
        <h4>What is in the way</h4>
        <p>
          <strong>
            {CONSTRAINT_NAME[constraint.constraint] ??
              valueLabel(labels, 'constraint.constraint', constraint.constraint) ??
              constraint.constraint}
          </strong>
        </p>
        <p className="brain-muted">{constraintWhy(constraint)}</p>
      </div>

      <div className="brain-block" data-testid="brain-intervention">
        <h4>Suggested next step</h4>
        <p>
          <strong>{todo.title}</strong>
          {todo.minutes > 0 && <span className="brain-muted"> {todo.minutes} min</span>}
        </p>
      </div>

      <div className="brain-block" data-testid="brain-drift">
        <h4>Plan versus this week</h4>
        {drift.length === 0 ? (
          <p className="brain-muted">No drift noted this week.</p>
        ) : (
          <ul className="brain-reasons">
            {drift.map((d, i) => (
              <li key={`${d.type ?? 'drift'}-${i}`}>{d.note}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function BrainPanel({ view }: { view: BrainView }) {
  if (view.status === 'offline') {
    return (
      <p className="brain-offline" data-testid="brain-offline">
        Live analysis is unavailable, so this shows the signals from this device.
      </p>
    );
  }
  return (
    <section className="brain-panel" aria-label="Where you stand" aria-busy={view.status === 'loading'} data-testid="brain-panel">
      <div className="brain-head">
        <h3>Where you stand</h3>
        <span className="brain-rules tag" data-testid="brain-rules">
          Rules-based, no AI
        </span>
      </div>
      {view.status === 'ok' && view.synthetic && <p className="brain-sim tag tag-sim">[SIMULATION] synthetic history</p>}
      {view.status === 'loading' ? (
        <div className="brain-skeleton" data-testid="brain-loading" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <BrainData data={view.data} />
      )}
    </section>
  );
}
