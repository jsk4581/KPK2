// ledger.js — per-partner metering of agent calls (tokens and USD).
//
// createLedger({ now? }) -> { record(partnerKey, usage), summary(), reset() }
//   record()  adds one call's usage to the partner's row and to the total; returns the row.
//             `usage.cost_usd` is used when present, otherwise computed from `usage.model`.
//   summary() -> { partners: { [key]: Row }, total: Row } (plain copies, safe to serialise)
//   Row = { calls, input_tokens, output_tokens, cache_read_input_tokens,
//           cache_creation_input_tokens, cost_usd, last_at }
// In-memory only; nothing is written to disk. `now` is injectable for tests.

import { USAGE_KEYS, costUsd, round6 } from './pricing.js';

function emptyRow() {
  return {
    calls: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    cost_usd: 0,
    last_at: null
  };
}

function count(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function keyOf(partnerKey) {
  const key = partnerKey === null || partnerKey === undefined ? '' : String(partnerKey).trim();
  return key || 'demo';
}

function usageCost(usage) {
  if (Number.isFinite(Number(usage.cost_usd))) return count(usage.cost_usd);
  return costUsd(usage.model, usage);
}

function addInto(row, usage, cost, at) {
  row.calls += 1;
  for (const key of USAGE_KEYS) row[key] += count(usage[key]);
  row.cost_usd = round6(row.cost_usd + cost);
  row.last_at = at;
}

export function createLedger(options = {}) {
  const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  let partners = new Map();
  let total = emptyRow();

  function record(partnerKey, usage) {
    const key = keyOf(partnerKey);
    const u = usage && typeof usage === 'object' ? usage : {};
    const cost = usageCost(u);
    const at = now();
    if (!partners.has(key)) partners.set(key, emptyRow());
    const row = partners.get(key);
    addInto(row, u, cost, at);
    addInto(total, u, cost, at);
    return { ...row };
  }

  function summary() {
    const out = {};
    for (const [key, row] of partners) out[key] = { ...row };
    return { partners: out, total: { ...total } };
  }

  function reset() {
    partners = new Map();
    total = emptyRow();
  }

  return { record, summary, reset };
}

export default { createLedger };
