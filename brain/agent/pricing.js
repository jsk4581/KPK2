// pricing.js — USD cost of one Claude call from its usage counters.
//
// Prices are USD per 1M tokens. Only the models the agent is allowed to run are listed;
// an unknown model (for example one served by a server-side refusal fallback) is priced
// at DEFAULT_MODEL rates so the ledger over-estimates rather than reports zero.
// Pure: no clock, no network.

export const DEFAULT_MODEL = 'claude-opus-5-5';

// { input, output, cache_read, cache_write } — cache_write is the 5-minute ephemeral tier.
export const PRICES = Object.freeze({
  'claude-opus-5-5': Object.freeze({ input: 4, output: 20, cache_read: 0.2, cache_write: 5 })
});

export const USAGE_KEYS = Object.freeze([
  'input_tokens',
  'output_tokens',
  'cache_read_input_tokens',
  'cache_creation_input_tokens'
]);

const PER_TOKEN = 1 / 1_000_000;

function count(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function round6(value) {
  return Math.round(value * 1e6) / 1e6;
}

// Whether `model` has its own price row.
export function knownModel(model) {
  return Object.prototype.hasOwnProperty.call(PRICES, model);
}

// Price row for `model`, falling back to DEFAULT_MODEL for unknown names.
export function priceFor(model) {
  return knownModel(model) ? PRICES[model] : PRICES[DEFAULT_MODEL];
}

// A zero usage record in the shape the agent and the ledger share.
export function emptyUsage() {
  return { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
}

// Add the counters of `usage` into `target` (mutates and returns `target`). Missing fields count as 0.
export function addUsage(target, usage) {
  const source = usage && typeof usage === 'object' ? usage : {};
  for (const key of USAGE_KEYS) target[key] = count(target[key]) + count(source[key]);
  return target;
}

// costUsd(model, usage) -> USD rounded to 6 decimals.
// Example: 1000 input + 500 output on claude-opus-5-5 = 0.004 + 0.010 = 0.014.
export function costUsd(model, usage) {
  const price = priceFor(model);
  const u = usage && typeof usage === 'object' ? usage : {};
  const total =
    count(u.input_tokens) * price.input +
    count(u.output_tokens) * price.output +
    count(u.cache_read_input_tokens) * price.cache_read +
    count(u.cache_creation_input_tokens) * price.cache_write;
  return round6(total * PER_TOKEN);
}

export default { DEFAULT_MODEL, PRICES, USAGE_KEYS, costUsd, priceFor, knownModel, emptyUsage, addUsage, round6 };
