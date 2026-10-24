// state.js — Decision Brain: "what state is this person in right now".
// Pure and deterministic: no DOM, no network, no clock. `today` and `condition` are inputs.
// Formulas: context/ALGORITHM_DESIGN_v1.md §4.2–4.3. Data shapes: docs/logic-contract.md
// (lifelog items {id, date, source, title, ...}, check-ins {actionId, kind, day}).
// Brain-only optional fields: lifelog item `condition` (1–5, self-reported) and check-in
// `date` (ISO), `condition`, `variant` ('micro' | 'full'), `minutes`. Nothing is inferred
// when a field is missing: energy stays null, a risk check is reported as skipped.

import { WEEK_DAYS } from '../app/logic.js';

// Energy is today's self-report, or yesterday's (§4.6 D1 plans on cond of the day before).
// An older report is not carried forward as "today": energy stays null and capacity stays 30.
export const ENERGY_MAX_AGE_DAYS = 1;

export const MOMENTUM_ALPHA = 0.3;
export const MOMENTUM_START = 0.5;
export const EFFICACY_ALPHA = 0.2;
export const EFFICACY_START = 0.5;
export const EFFICACY_COMEBACK_BONUS = 0.05;
export const BASE_CAPACITY_MIN = 30;
export const MICRO_MINUTES = 10;
// g(cond): capacity never grows above the 30-minute base, even at 5 (no over-promising).
export const CAPACITY_FACTOR = { 1: 0.2, 2: 0.4, 3: 0.7, 4: 1, 5: 1 };
// Risk score table (§4.3). Rule names are what `risk.reasons` and explain() cite.
export const RISK_RULES = {
  gap_days: 'days since the last logged day (lifelog or check-in): >= 2 -> +2, >= 4 -> +3',
  consec_rest: 'trailing Not today check-ins >= 2 -> +2',
  low_momentum: 'momentum (EWMA a=0.3 of daily scores) < 0.35 -> +1',
  low_condition: 'mean self-reported condition over the last 3 days <= 2 -> +1',
  low_self_efficacy: 'self-efficacy (EWMA a=0.2 of successes/attempts) < 0.4 -> +1',
  first_week: 'first 7 days of the arc -> +1',
  data_gap: 'days since the last lifelog item >= 2 -> +1',
};
const MAX_WINDOW_DAYS = 400;

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));
const round3 = (n) => Math.round((n + Number.EPSILON) * 1000) / 1000;
const clamp01 = (n) => Math.min(1, Math.max(0, n));

// ---------- dates (ISO strings only; no Date.now()) ----------

// "YYYY-MM-DD" -> whole days since 1970-01-01, or null when not an ISO date.
export function dateOrdinal(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asText(date));
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (!Number.isFinite(ms)) return null;
  const ordinal = ms / 86400000;
  // Date.UTC rolls "2026-13-45" forward instead of rejecting it; require an exact round trip.
  return ordinalDate(ordinal) === asText(date) ? ordinal : null;
}

// Ordinal -> "YYYY-MM-DD".
export function ordinalDate(ordinal) {
  return new Date(ordinal * 86400000).toISOString().slice(0, 10);
}

// ISO date -> 'Mon'..'Sun' (1970-01-01 was a Thursday), or null.
export function weekdayOf(date) {
  const o = dateOrdinal(date);
  if (o === null) return null;
  return WEEK_DAYS[(((o + 3) % 7) + 7) % 7];
}

// to - from in days, or null when either is not an ISO date.
export function daysBetween(from, to) {
  const a = dateOrdinal(from);
  const b = dateOrdinal(to);
  return a === null || b === null ? null : b - a;
}

export function isIsoDate(value) {
  return dateOrdinal(value) !== null;
}

// A valid self-reported condition is an integer 1..5; anything else is null (never inferred).
export function validCondition(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

// Cap = 30 min x g(condition); null condition keeps the base 30 (nothing is inferred).
export function capacityMinutes(condition) {
  const c = validCondition(condition);
  if (c === null) return BASE_CAPACITY_MIN;
  return Math.round(BASE_CAPACITY_MIN * CAPACITY_FACTOR[c]);
}

export function riskLevel(points) {
  if (points <= 1) return 'green';
  if (points <= 3) return 'amber';
  return 'red';
}

// Stable reference for a check-in that has no id of its own: "<actionId>@<date|day>".
export function checkinId(checkin) {
  const c = checkin && typeof checkin === 'object' ? checkin : {};
  if (c.id !== undefined && c.id !== null && c.id !== '') return asText(c.id);
  return `${asText(c.actionId)}@${isIsoDate(c.date) ? c.date : asText(c.day)}`;
}

// Check-in -> ISO date. Uses `date` when present; otherwise the latest date on or before
// `todayDate` whose weekday equals `day`. Null when neither resolves (never guessed).
export function resolveCheckinDate(checkin, todayDate) {
  const c = checkin && typeof checkin === 'object' ? checkin : {};
  if (isIsoDate(c.date)) return c.date;
  const todayOrd = dateOrdinal(todayDate);
  const dayIdx = WEEK_DAYS.indexOf(c.day);
  if (todayOrd === null || dayIdx < 0) return null;
  const todayIdx = WEEK_DAYS.indexOf(weekdayOf(todayDate));
  const back = (((todayIdx - dayIdx) % 7) + 7) % 7;
  return ordinalDate(todayOrd - back);
}

function isMicro(checkin) {
  if (checkin.variant === 'micro') return true;
  const minutes = Number(checkin.minutes);
  return Number.isFinite(minutes) && minutes > 0 && minutes <= MICRO_MINUTES;
}

function compareItems(a, b) {
  const left = `${asText(a.date)}\u0000${asText(a.id)}`;
  const right = `${asText(b.date)}\u0000${asText(b.id)}`;
  return left < right ? -1 : left > right ? 1 : 0;
}

function mean(values) {
  return values.length === 0 ? null : values.reduce((s, v) => s + v, 0) / values.length;
}

function normalizeInput(a, b, c, d) {
  // Accepts estimateState({lifelog, checkins, today, condition}) and the positional
  // estimateState(lifelog, checkins, today, condition) form from BRAIN_ARCH_v2 §1.
  if (Array.isArray(a) || b !== undefined) return { lifelog: a, checkins: b, today: c, condition: d };
  return a && typeof a === 'object' ? a : {};
}

// ---------- estimateState ----------

// -> { energy, energySource, momentum, selfEfficacy, capacityMin, dataGapDays, gapDays,
//      consecRest, condMean3, condTrend, firstWeek, today, lastLogId, lastLogDate,
//      risk: { points, level, reasons[], checks[] }, features[] }
// features[] is the per-day table (one row per calendar day from the first dated event
// to today) so explain() can cite the exact day a rule fired on.
export function estimateState(a, b, c, d) {
  const input = normalizeInput(a, b, c, d);
  const allItems = asArray(input.lifelog)
    .filter((item) => item && typeof item === 'object' && isIsoDate(item.date))
    .sort(compareItems);
  const records = asArray(input.checkins)
    .map((checkin, index) => ({ checkin, index }))
    .filter(({ checkin }) => checkin && (checkin.kind === 'done' || checkin.kind === 'not_today'));
  const argCondition = validCondition(input.condition);

  // Today: the ISO `today` input, else the latest dated event (demo passes a weekday).
  const eventDates = [...allItems.map((i) => i.date), ...records.map(({ checkin }) => checkin.date).filter(isIsoDate)];
  const todayDate = isIsoDate(input.today) ? input.today : eventDates.length > 0 ? eventDates.sort()[eventDates.length - 1] : null;
  const todayOrd = dateOrdinal(todayDate);

  // Nothing dated after today exists yet: a caller may pass the whole history with an earlier
  // `today` to replay a past day, and the answer must equal the one for the history sliced at
  // that day. Undated check-ins (no `date`, no resolvable weekday) cannot be placed and are kept.
  const onOrBeforeToday = (date) => todayOrd === null || dateOrdinal(date) <= todayOrd;
  const items = allItems.filter((item) => onOrBeforeToday(item.date));
  const dated = records
    .map(({ checkin, index }) => ({
      ...checkin,
      index,
      id: checkinId(checkin),
      resolvedDate: resolveCheckinDate(checkin, todayDate),
    }))
    .filter((r) => r.resolvedDate === null || onOrBeforeToday(r.resolvedDate));

  // Trailing Not today count in check-in order (same reading as logic.progressSignals),
  // over the check-ins on or before today only.
  let consecRest = 0;
  for (let i = dated.length - 1; i >= 0 && dated[i].kind === 'not_today'; i -= 1) consecRest += 1;

  const allDates = [...items.map((i) => i.date), ...dated.map((r) => r.resolvedDate).filter(Boolean)];
  const arcStart = isIsoDate(input.arcStart) ? input.arcStart : allDates.length > 0 ? allDates.sort()[0] : null;

  // ----- per-day feature table -----
  const features = [];
  let momentum = MOMENTUM_START;
  let selfEfficacy = EFFICACY_START;
  let lastCheckinDay = null;
  if (todayOrd !== null && allDates.length > 0) {
    const firstOrd = Math.max(dateOrdinal(allDates.sort()[0]), todayOrd - (MAX_WINDOW_DAYS - 1));
    const startOrd = Math.min(firstOrd, arcStart ? Math.max(dateOrdinal(arcStart), todayOrd - (MAX_WINDOW_DAYS - 1)) : firstOrd);
    for (let ord = startOrd; ord <= todayOrd; ord += 1) {
      const date = ordinalDate(ord);
      const dayItems = items.filter((i) => i.date === date);
      const dayRecords = dated.filter((r) => r.resolvedDate === date);
      const done = dayRecords.filter((r) => r.kind === 'done').length;
      const notToday = dayRecords.length - done;
      const logged = dayItems.length > 0 || dayRecords.length > 0;
      const score = done > 0 ? 1 : logged ? 0.5 : 0;
      momentum = MOMENTUM_ALPHA * score + (1 - MOMENTUM_ALPHA) * momentum;

      const attempts = done + notToday;
      let bonus = 0;
      if (attempts > 0) {
        selfEfficacy = EFFICACY_ALPHA * (done / attempts) + (1 - EFFICACY_ALPHA) * selfEfficacy;
        // Mastery after a setback: a micro step done right after a rest day.
        const microDone = dayRecords.some((r) => r.kind === 'done' && isMicro(r));
        if (microDone && lastCheckinDay && lastCheckinDay.done === 0 && lastCheckinDay.notToday > 0) bonus = EFFICACY_COMEBACK_BONUS;
        selfEfficacy = clamp01(selfEfficacy + bonus);
      }

      // Self-reported condition for the day: the live `condition` argument wins for today,
      // otherwise the last report of the day (check-ins after lifelog items).
      let condition = null;
      let conditionSource = null;
      for (const item of dayItems) {
        const v = validCondition(item.condition);
        if (v !== null) { condition = v; conditionSource = { type: 'lifelog', id: asText(item.id), date }; }
      }
      for (const r of dayRecords) {
        const v = validCondition(r.condition);
        if (v !== null) { condition = v; conditionSource = { type: 'checkin', id: r.id, date }; }
      }
      if (date === todayDate && argCondition !== null) {
        condition = argCondition;
        conditionSource = { type: 'arg', date };
      }

      features.push({
        date,
        day: weekdayOf(date),
        logged,
        lifelogIds: dayItems.map((i) => asText(i.id)),
        checkins: dayRecords.map((r) => ({ id: r.id, actionId: asText(r.actionId), kind: r.kind })),
        done,
        notToday,
        condition,
        conditionSource,
        score,
        momentum: round3(momentum),
        selfEfficacy: round3(selfEfficacy),
        efficacyBonus: bonus,
      });
      if (attempts > 0) lastCheckinDay = { date, done, notToday };
    }
  }

  // ----- energy: latest self-report only, and no older than ENERGY_MAX_AGE_DAYS -----
  // features[] has one row per calendar day ending today, so (last index - i) is the age in days.
  let energy = null;
  let energySource = null;
  if (argCondition !== null) {
    energy = argCondition;
    energySource = { type: 'arg', date: todayDate };
  } else {
    for (let i = features.length - 1; i >= 0 && features.length - 1 - i <= ENERGY_MAX_AGE_DAYS; i -= 1) {
      if (features[i].condition !== null) { energy = features[i].condition; energySource = features[i].conditionSource; break; }
    }
  }

  // ----- gaps, condition window, arc week -----
  const lastItem = items.length > 0 ? items[items.length - 1] : null;
  const dataGapDays = lastItem && todayOrd !== null ? Math.max(0, todayOrd - dateOrdinal(lastItem.date)) : null;
  const loggedDays = features.filter((f) => f.logged);
  const gapDays = loggedDays.length > 0 ? todayOrd - dateOrdinal(loggedDays[loggedDays.length - 1].date) : null;
  const recent3 = features.slice(-3).map((f) => f.condition).filter((v) => v !== null);
  const prev3 = features.slice(-6, -3).map((f) => f.condition).filter((v) => v !== null);
  const condMean3 = recent3.length > 0 ? round3(mean(recent3)) : null;
  const condTrend = recent3.length > 0 && prev3.length > 0 ? round3(mean(recent3) - mean(prev3)) : null;
  const arcDay = arcStart && todayDate ? daysBetween(arcStart, todayDate) : null;
  const firstWeek = arcDay === null ? null : arcDay >= 0 && arcDay < 7;

  // ----- risk table: every rule reports hit / clear / skipped (a skipped check is never "clear") -----
  const checks = [
    { rule: 'gap_days', value: gapDays, points: gapDays === null ? 0 : gapDays >= 4 ? 3 : gapDays >= 2 ? 2 : 0, skipped: gapDays === null },
    { rule: 'consec_rest', value: consecRest, points: consecRest >= 2 ? 2 : 0, skipped: false },
    { rule: 'low_momentum', value: round3(momentum), points: momentum < 0.35 ? 1 : 0, skipped: features.length === 0 },
    { rule: 'low_condition', value: condMean3, points: condMean3 !== null && condMean3 <= 2 ? 1 : 0, skipped: condMean3 === null },
    { rule: 'low_self_efficacy', value: round3(selfEfficacy), points: selfEfficacy < 0.4 ? 1 : 0, skipped: features.length === 0 },
    { rule: 'first_week', value: firstWeek, points: firstWeek === true ? 1 : 0, skipped: firstWeek === null },
    { rule: 'data_gap', value: dataGapDays, points: dataGapDays !== null && dataGapDays >= 2 ? 1 : 0, skipped: dataGapDays === null },
  ].map((check) => ({ ...check, status: check.skipped ? 'skipped' : check.points > 0 ? 'hit' : 'clear' }));
  const points = checks.reduce((sum, check) => sum + check.points, 0);

  return {
    energy,
    energySource,
    momentum: round3(momentum),
    selfEfficacy: round3(selfEfficacy),
    capacityMin: capacityMinutes(energy),
    dataGapDays,
    gapDays,
    consecRest,
    condMean3,
    condTrend,
    firstWeek,
    arcStart,
    today: todayDate,
    lastLogId: lastItem ? asText(lastItem.id) : null,
    lastLogDate: lastItem ? lastItem.date : null,
    risk: {
      points,
      level: riskLevel(points),
      reasons: checks.filter((c) => c.status === 'hit').map((c) => c.rule),
      checks,
      rules: { ...RISK_RULES },
    },
    features,
  };
}
