import type { BrainCheckin, BrainLifelogItem, BrainScenario, ThinkInput } from '../api/brain';
import type { AppState, Day } from '../state/types';

// Builds the /v1/think input from what the screens hold. Mapping rules (tested in adapter.test.ts):
//
// 1. Who counts as a sample persona user: the lifelog card was opened (state.lifelogConnected).
//    Everyone else is a Start user (own text, no lifelog).
// 2. Start users send fields, rankedRoles and the week only. No lifelog, no check-in history,
//    no sources, no today.
// 3. Sample persona users send one Dana timeline, the app's own (the persona lifelog the
//    screens show), in the server's synthetic history shape:
//    a. lifelog = our persona lifelog items dated on or before the demo today (see d), filtered
//       to the sources switched on (disabled sources never leave the browser); enabledSources is
//       sent too. The scenario's lifelog is never sent: it is a second Dana timeline whose items
//       overlap ours under other dates, and mixing the two would count the same events twice.
//    b. checkins = the scenario check-ins dated before the Monday of the demo week (earlier
//       weeks of the arc; actionId prefixed "scenario-" so the history is never counted against
//       this week's actions a1-a3) followed by this session's check-ins. Without a demo today
//       the history cannot be placed and is not sent.
//    c. Session check-ins keep their weekday label and get an ISO date: the day with that label
//       in the demo week (Monday to Sunday, the week that holds the demo today, see d).
//    d. today = the demo today as an ISO date: the persona's `today` weekday (the same day the
//       Week screen uses) in the week of the persona's latest lifelog item. Never the scenario's
//       own today, so the brain and the Week screen agree on which actions are due or overdue.
//    e. condition = the condition the user picked on the week screen, when one was picked.
// 4. For everyone: fields are sent exactly as currently on screen (never recomputed, edits kept),
//    rankedRoles as ranked, the chosen path draft (with its role title) and this week's actions
//    from our state, as they are.

export const SCENARIO_ID_PREFIX = 'scenario-';

const WEEK_DAYS: readonly Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface PersonaLike {
  today: string;
  lifelog: ReadonlyArray<{ id: string; date: string; source: string; [key: string]: unknown }>;
}

export function isSampleUser(state: AppState): boolean {
  return state.lifelogConnected;
}

function parseIso(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// ISO date of a weekday label in the Monday-to-Sunday week that holds todayIso. Null for
// NextWeek or anything that is not a weekday.
export function isoForWeekday(day: string, todayIso: string): string | null {
  const today = parseIso(todayIso);
  const index = WEEK_DAYS.indexOf(day as Day);
  if (today === null || index < 0) return null;
  const todayIndex = (new Date(today).getUTCDay() + 6) % 7; // Mon = 0
  return formatIso(today + (index - todayIndex) * 86_400_000);
}

// The demo today as an ISO date: the persona's `today` weekday (what the Week screen calls
// today) in the Monday-to-Sunday week that holds the persona's latest lifelog date. Null when
// the persona has no dated item or no weekday.
export function demoTodayIso(persona: PersonaLike): string | null {
  const dates = persona.lifelog.map((item) => item.date).filter((d) => parseIso(d) !== null).sort();
  const latest = dates[dates.length - 1];
  return latest ? isoForWeekday(persona.today, latest) : null;
}

function chosenPath(state: AppState): Record<string, unknown> | undefined {
  const draft = state.paths?.paths.find((p) => p.role_id === state.chosenPathId);
  if (!draft) return undefined;
  const role = state.rankedRoles.find((r) => r.id === state.chosenPathId);
  return role ? { ...draft, title: role.title } : { ...draft };
}

function baseInput(state: AppState): ThinkInput {
  const input: ThinkInput = {
    fields: { ...state.fields },
    rankedRoles: state.rankedRoles.map((r) => ({ ...r })),
  };
  if (state.week) input.week = { ...state.week } as unknown as Record<string, unknown>;
  return input;
}

export function toThinkInput(state: AppState, persona: PersonaLike, scenario?: BrainScenario | null): ThinkInput {
  const input = baseInput(state);
  if (!isSampleUser(state)) return input;

  const today = demoTodayIso(persona);
  const enabled = new Set<string>(state.enabledSources);
  const ours: BrainLifelogItem[] = persona.lifelog
    .filter((item) => enabled.has(item.source) && (today === null || item.date <= today))
    .map((item) => ({ ...item }));

  // ISO dates compare correctly as strings.
  const weekStart = today ? isoForWeekday('Mon', today) : null;
  const pastCheckins: BrainCheckin[] = (weekStart ? (scenario?.checkins ?? []) : [])
    .filter((c) => typeof c.date === 'string' && parseIso(c.date) !== null && c.date < weekStart!)
    .map((c) => ({ ...c, actionId: `${SCENARIO_ID_PREFIX}${c.actionId}` }));
  const sessionCheckins: BrainCheckin[] = state.checkins.map((c) => {
    const record: BrainCheckin = { actionId: c.actionId, kind: c.kind, day: c.day };
    const date = today ? isoForWeekday(c.day, today) : null;
    if (date) record.date = date;
    return record;
  });

  const path = chosenPath(state);
  return {
    ...input,
    lifelog: ours,
    enabledSources: [...state.enabledSources],
    checkins: [...pastCheckins, ...sessionCheckins],
    ...(path ? { path } : {}),
    ...(today ? { today } : {}),
    ...(state.condition !== null && state.condition >= 1 && state.condition <= 5 ? { condition: state.condition } : {}),
  };
}
