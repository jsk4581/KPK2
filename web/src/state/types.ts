// Shared UI state types. Judgment results come from ../app/logic.js; these
// types only describe the shapes the screens hold in memory.

export type Screen = 'landing' | 'lifelog' | 'inputs' | 'paths' | 'week' | 'progress';

export type FieldKey = 'career' | 'now' | 'pull';

export type Fields = Record<FieldKey, string>;

export type LifelogSource =
  | 'note'
  | 'saved_link'
  | 'calendar'
  | 'sms'
  | 'messenger'
  | 'document'
  | 'photo';

export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' | 'NextWeek';

export type ActionStatus = 'todo' | 'done' | 'moved';

export interface RankedRole {
  id: string;
  title: string;
  ratio: number;
  transfers: string[];
  missing: string[];
}

export interface DraftAction {
  title: string;
  minutes: number;
  day: Day;
  short: string;
}

export interface PathDraft {
  role_id: string;
  one_liner: string;
  first_two_weeks: string[];
  week: { actions: DraftAction[] };
  arc_12w: string;
}

export interface PathsResponse {
  source: 'llm' | 'fallback';
  paths: PathDraft[];
}

export interface WeekAction {
  id: string;
  title: string;
  minutes: number;
  day: Day;
  status: ActionStatus;
  moves: number;
  short: string;
}

export interface Week {
  actions: WeekAction[];
  summary: string;
}

export interface CheckinRecord {
  actionId: string;
  kind: 'done' | 'not_today';
  day: Day;
  message: string;
  adjustment: unknown;
  shareCard: unknown;
  comeback: string | null;
}

export interface TraceEntry {
  fn: string;
  input: string;
  output: string;
  via?: 'logic' | 'llm' | 'fallback';
}

export interface AppState {
  screen: Screen;
  fields: Fields;
  editedFields: Set<FieldKey>;
  enabledSources: LifelogSource[];
  rankedRoles: RankedRole[];
  paths: PathsResponse | null;
  chosenPathId: string | null;
  week: Week | null;
  condition: number | null;
  checkins: CheckinRecord[];
  trace: TraceEntry[];
}
