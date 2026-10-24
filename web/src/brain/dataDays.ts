import type { ThinkOutput } from '../api/brain';

// How much of the brain's state was measured rather than carried over from its starting
// values. The brain starts momentum and self-efficacy at 0.5 and moves them a little each day
// (EWMA), so with no or very few days of data the number is mostly that starting value. The
// panel shows a word for a value only once MIN_DATA_DAYS days fed it; before that it says
// "Not enough data" instead of presenting the starting value as a finding.
export const MIN_DATA_DAYS = 3;

export interface DataDays {
  // Days in the brain's per-day table (state.features).
  rows: number;
  // Days with any lifelog item or check-in: these move momentum.
  logged: number;
  // Days with a Done or Not today: these move self-efficacy.
  checkins: number;
}

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

export function dataDays(state: ThinkOutput['state']): DataDays {
  const rows = (Array.isArray(state.features) ? state.features : []).filter(
    (row): row is Record<string, unknown> => row !== null && typeof row === 'object',
  );
  return {
    rows: rows.length,
    logged: rows.filter((row) => row.logged === true).length,
    checkins: rows.filter((row) => count(row.done) + count(row.notToday) > 0).length,
  };
}

// The risk table only reads the user's data; with no day at all and no rule hit there is
// nothing behind a "Low".
export function riskMeasured(state: ThinkOutput['state'], days: DataDays): boolean {
  return days.rows > 0 || state.risk.reasons.length > 0;
}
