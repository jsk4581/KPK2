import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type {
  AppState,
  CheckinRecord,
  FieldKey,
  Fields,
  LifelogSource,
  PathsResponse,
  RankedRole,
  Screen,
  TraceEntry,
  Week,
} from './types';

// Message and messenger sources start off (privacy default).
export const DEFAULT_ENABLED_SOURCES: LifelogSource[] = ['note', 'saved_link', 'calendar'];

export const EMPTY_FIELDS: Fields = { career: '', now: '', pull: '' };

export function createInitialState(): AppState {
  return {
    screen: 'landing',
    fields: { ...EMPTY_FIELDS },
    editedFields: new Set<FieldKey>(),
    enabledSources: [...DEFAULT_ENABLED_SOURCES],
    rankedRoles: [],
    paths: null,
    chosenPathId: null,
    week: null,
    condition: null,
    checkins: [],
    trace: [],
  };
}

export type Action =
  | { type: 'reset' }
  | { type: 'go'; screen: Screen }
  // A user edit: marks the field as edited so prefill never overwrites it.
  | { type: 'editField'; field: FieldKey; value: string }
  // Prefill from lifelog or sample persona: skips fields the user edited.
  | { type: 'prefillFields'; fields: Partial<Fields> }
  | { type: 'setEnabledSources'; sources: LifelogSource[] }
  | { type: 'setRankedRoles'; roles: RankedRole[] }
  | { type: 'setPaths'; paths: PathsResponse | null }
  // Choosing (or re-choosing) a path starts a fresh week and clears check-ins.
  | { type: 'choosePath'; pathId: string; week: Week }
  | { type: 'setWeek'; week: Week }
  | { type: 'setCondition'; condition: number | null }
  | { type: 'addCheckin'; record: CheckinRecord }
  | { type: 'addTrace'; entries: TraceEntry[] };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'reset':
      return createInitialState();
    case 'go':
      return { ...state, screen: action.screen };
    case 'editField': {
      const editedFields = new Set(state.editedFields);
      editedFields.add(action.field);
      return { ...state, fields: { ...state.fields, [action.field]: action.value }, editedFields };
    }
    case 'prefillFields': {
      const fields = { ...state.fields };
      for (const key of Object.keys(action.fields) as FieldKey[]) {
        const value = action.fields[key];
        if (value !== undefined && !state.editedFields.has(key)) fields[key] = value;
      }
      return { ...state, fields };
    }
    case 'setEnabledSources':
      return { ...state, enabledSources: [...action.sources] };
    case 'setRankedRoles':
      return { ...state, rankedRoles: action.roles };
    case 'setPaths':
      return { ...state, paths: action.paths };
    case 'choosePath':
      return { ...state, chosenPathId: action.pathId, week: action.week, checkins: [] };
    case 'setWeek':
      return { ...state, week: action.week };
    case 'setCondition':
      return { ...state, condition: action.condition };
    case 'addCheckin':
      return { ...state, checkins: [...state.checkins, action.record] };
    case 'addTrace':
      return { ...state, trace: [...state.trace, ...action.entries] };
    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: AppState;
}) {
  const [state, dispatch] = useReducer(reducer, initialState ?? createInitialState());
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
