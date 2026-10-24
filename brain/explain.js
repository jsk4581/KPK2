// explain.js — Decision Brain [Why?]: the rule names that fired and the evidence ids they
// rest on. Trace entries use the same { fn, input, output, via } shape as logic.withTrace.
// Pure and deterministic. Only cites ids/dates that are present in the inputs.

import { summarizeForTrace } from '../app/logic.js';
import { checkinId } from './state.js';

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));

function pushUnique(list, entry) {
  const key = `${entry.type}:${entry.id ?? ''}:${entry.date ?? ''}`;
  if (!list.some((e) => `${e.type}:${e.id ?? ''}:${e.date ?? ''}` === key)) list.push(entry);
}

function lifelogEvidence(items, id, note) {
  const item = items.find((i) => asText(i.id) === asText(id));
  return item ? { type: 'lifelog', id: asText(item.id), date: item.date, note } : null;
}

function checkinEvidence(checkins, id, note) {
  const checkin = checkins.find((c) => checkinId(c) === asText(id));
  if (!checkin) return null;
  return { type: 'checkin', id: checkinId(checkin), actionId: asText(checkin.actionId), date: checkin.date || null, day: checkin.day || null, kind: checkin.kind, note };
}

function featureEvidence(features, date, note) {
  const row = features.find((f) => f.date === date);
  return row ? { type: 'feature', date: row.date, note } : null;
}

// (decision, { state, constraint, lifelog, checkins, week, today }) -> { rules, evidence, trace, text }
export function explain(decision, inputs) {
  const d = decision && typeof decision === 'object' ? decision : {};
  const input = inputs && typeof inputs === 'object' ? inputs : {};
  const state = input.state && typeof input.state === 'object' ? input.state : {};
  const constraint = input.constraint && typeof input.constraint === 'object' ? input.constraint : null;
  const items = asArray(input.lifelog).filter((i) => i && typeof i === 'object');
  const checkins = asArray(input.checkins).filter((c) => c && typeof c === 'object');
  const features = asArray(state.features);
  const risk = state.risk && typeof state.risk === 'object' ? state.risk : { reasons: [], checks: [] };

  // ----- rules -----
  const rules = [];
  for (const r of asArray(d.reasons)) rules.push(`policy:${asText(r)}`);
  for (const r of asArray(risk.reasons)) rules.push(`risk:${asText(r)}`);
  if (constraint) rules.push(`constraint:${asText(constraint.constraint) || 'unknown'}`);
  const skipped = asArray(risk.checks).filter((c) => c.status === 'skipped').map((c) => `risk:${c.rule}:skipped`);
  rules.push(...skipped);

  // ----- evidence -----
  const evidence = [];
  const add = (entry) => entry && pushUnique(evidence, entry);

  if (state.energySource && state.energySource.type === 'lifelog') {
    add(lifelogEvidence(items, state.energySource.id, `condition ${state.energy}/5 self-reported on ${state.energySource.date}`));
  } else if (state.energySource && state.energySource.type === 'checkin') {
    add(checkinEvidence(checkins, state.energySource.id, `condition ${state.energy}/5 self-reported with a check-in`));
  }
  if (state.lastLogId && state.dataGapDays !== null && state.dataGapDays !== undefined) {
    add(lifelogEvidence(items, state.lastLogId, `last lifelog item; ${state.dataGapDays} day(s) before today`));
  }

  const today = features.length > 0 ? features[features.length - 1] : null;
  for (const reason of asArray(risk.reasons)) {
    if (reason === 'consec_rest') {
      const trailing = [];
      for (let i = checkins.length - 1; i >= 0 && checkins[i].kind === 'not_today'; i -= 1) trailing.unshift(checkins[i]);
      for (const c of trailing) add(checkinEvidence(checkins, checkinId(c), 'Not today in the trailing run'));
    } else if (reason === 'low_condition') {
      for (const row of features.slice(-3)) if (row.condition !== null) add(featureEvidence(features, row.date, `condition ${row.condition}/5`));
    } else if (reason === 'first_week' && state.arcStart) {
      add(featureEvidence(features, state.arcStart, 'first day of the arc'));
    } else if (today) {
      const note = reason === 'low_momentum' ? `momentum ${today.momentum}`
        : reason === 'low_self_efficacy' ? `self-efficacy ${today.selfEfficacy}`
        : reason === 'gap_days' ? `${state.gapDays} day(s) since the last logged day`
        : `${state.dataGapDays} day(s) since the last lifelog item`;
      add(featureEvidence(features, today.date, note));
    }
  }

  if (constraint) {
    for (const id of asArray(constraint.evidence)) {
      add(lifelogEvidence(items, id, `Not today reason -> ${constraint.constraint}`) || checkinEvidence(checkins, id, `Not today reason -> ${constraint.constraint}`));
    }
  }

  if (d.actionId && today) add(featureEvidence(features, today.date, `today's row: score ${today.score}, momentum ${today.momentum}`));

  // ----- trace (same shape as logic.withTrace) -----
  const trace = [
    {
      fn: 'estimateState',
      input: summarizeForTrace({ lifelog: items.length, checkins: checkins.length, today: state.today ?? input.today ?? null }),
      output: summarizeForTrace({ energy: state.energy ?? null, momentum: state.momentum ?? null, selfEfficacy: state.selfEfficacy ?? null, capacityMin: state.capacityMin ?? null, dataGapDays: state.dataGapDays ?? null, risk: risk.level ?? null }),
      via: 'brain',
    },
  ];
  if (constraint) {
    trace.push({
      fn: 'rootConstraint',
      input: summarizeForTrace({ checkins: checkins.length, lifelog: items.length }),
      output: summarizeForTrace({ constraint: constraint.constraint, score: constraint.score, evidence: asArray(constraint.evidence) }),
      via: 'brain',
    });
  }
  trace.push({
    fn: 'decideIntervention',
    input: summarizeForTrace({ energy: state.energy ?? null, risk: risk.level ?? null, capacityMin: state.capacityMin ?? null, dataGapDays: state.dataGapDays ?? null, constraint: constraint ? constraint.constraint : 'unknown', today: d.day ?? null }),
    output: summarizeForTrace({ kind: d.kind, actionId: d.actionId, minutes: d.minutes, messageKey: d.messageKey, choices: asArray(d.choices) }),
    via: 'brain',
  });

  const evidenceLine = evidence.length === 0 ? 'evidence: none cited' : `evidence: ${evidence.map((e) => `${e.type} ${e.id ?? e.date} — ${e.note}`).join(' · ')}`;
  const text = [
    `${asText(d.kind) || 'none'}${d.actionId ? ` ${d.actionId}` : ''}${Number.isFinite(d.minutes) ? ` (${d.minutes} min)` : ''} -> ${asText(d.messageKey) || 'NONE'}`,
    `rules: ${rules.join(', ')}`,
    evidenceLine,
    ...trace.map((t) => `${t.fn}(${t.input}) -> ${t.output}`),
  ].join('\n');

  return { rules, evidence, trace, text };
}
