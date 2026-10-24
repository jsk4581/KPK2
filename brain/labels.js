// labels.js — short user-facing English names for the brain's internal field names and enum values.
//
// The web's [Why?] panel reads think() output; these labels let it show "Confidence" instead of
// `state.selfEfficacy` and "Smaller step" instead of `shrink`. No judgment lives here: the map is
// static, every string passes messages.lint, and labelFor() returns null for anything it does not
// know (never a guess). Attached to think() output as `labels`.

export const LABELS = {
  // Internal field path -> what the screen calls it.
  fields: {
    'state.energy': 'Energy today',
    'state.momentum': 'Momentum',
    'state.selfEfficacy': 'Confidence',
    'state.capacityMin': "Today's capacity (min)",
    'state.dataGapDays': 'Days without a signal',
    'state.risk.level': 'Risk of drifting',
    'constraint.constraint': 'What is in the way',
    'intervention.kind': "Today's step",
    'intervention.minutes': 'Minutes',
    'goal.state': 'Goal',
    'goal.milestones': 'Gates',
    'readiness.score': 'Job readiness (0-100)',
    'readiness.level': 'Job readiness stage',
    'monitor.drift': 'Plan versus reality',
  },
  // Enum field path -> { internal value -> label }.
  values: {
    'state.risk.level': {
      green: 'Low',
      amber: 'Medium',
      red: 'High',
    },
    'constraint.constraint': {
      'opportunity-time': 'Time',
      'motivation-automatic': 'Energy & mood',
      capability: 'Skills',
      'opportunity-social': 'People',
      'motivation-reflective': 'Doubts',
      unknown: 'Not enough signal yet',
    },
    'intervention.kind': {
      full: 'Full step',
      shrink: 'Smaller step',
      rest: 'Rest day',
      reconnect: 'Reconnect',
      comeback: 'Welcome back',
      gate: 'Gate passed',
      pause: 'Pause',
      none: 'No step today',
    },
    'goal.state': {
      ambiguous: 'Still exploring',
      provisional: 'Path chosen',
      validated: 'On track',
    },
    'readiness.level': {
      explore: 'Explore',
      'build-proof': 'Build proof',
      'reach-out': 'Reach out',
      apply: 'Apply',
    },
    // Gate ids (goal.milestones[].id) -> the 12-week gate names.
    'goal.milestones.id': {
      M1: 'Fit check',
      M2: 'First proof',
      M3: 'Market contact',
      M4: 'Ready to apply',
    },
  },
};

const asText = (value) => (value === null || value === undefined ? '' : String(value));

// labelFor('state.risk.level') -> the field label; labelFor('state.risk.level', 'amber') -> the
// value label. Unknown path or value -> null.
export function labelFor(path, value) {
  const key = asText(path);
  if (value === undefined) return Object.hasOwn(LABELS.fields, key) ? LABELS.fields[key] : null;
  const values = LABELS.values[key];
  const name = asText(value);
  return values && Object.hasOwn(values, name) ? values[name] : null;
}

export default { LABELS, labelFor };
