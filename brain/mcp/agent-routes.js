// agent-routes.js — REST front for the LLM agent (brain/agent/index.js) served by http.js.
//
//   POST /v1/agent/chat   {scenario_id?, persona?, lifelog?, history?, user_turn, today?} → agent.chat() result
//   GET  /v1/usage        ledger summary {enabled, partners, total} + pricing
//
// The agent is injected as ctx.agent by bin.js (only when ANTHROPIC_API_KEY is set); this
// module never reads the key and never imports the SDK. Missing request fields default to the
// loaded scenario (brain.scenario). X-Partner-Key names the caller for the usage ledger
// ('demo' when absent or malformed). http.js applies CORS, rate limit, bearer token and the
// body limit before dispatching here, exactly as for the compat routes.
//
// Error bodies are { error: { code, message } }: 400 invalid_json/invalid_input, 404, 405,
// 503 agent_disabled (no agent), 502 agent_error (the agent threw; message is generic, the
// detail goes to the server log only). Nothing here throws into http.js.

import { z } from 'zod';

export const AGENT_ROUTES = ['/v1/agent/chat', '/v1/usage'];
export const DEFAULT_PARTNER_KEY = 'demo';
export const DEFAULT_MODEL = 'claude-opus-5-5';
// USD per million tokens (cache write is the 5-minute tier).
export const USD_PER_MTOK = { input: 4, output: 20, cache_read: 0.2, cache_write: 5 };

const PARTNER_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

export function isAgentRoute(path) {
  return path === '/v1/usage' || path.startsWith('/v1/agent/');
}

// X-Partner-Key → ledger key. Anything that is not a short token falls back to the demo key.
export function partnerKeyOf(headers) {
  const raw = asObject(headers)['x-partner-key'];
  const text = typeof raw === 'string' ? raw.trim() : '';
  return PARTNER_KEY_RE.test(text) ? text : DEFAULT_PARTNER_KEY;
}

export function agentEnabled(ctx) {
  const agent = asObject(ctx).agent;
  return Boolean(agent && agent.enabled === true && typeof agent.chat === 'function') && process.env.BRAIN_AGENT !== 'off';
}

export function pricingOf(agent) {
  const model = typeof asObject(agent).model === 'string' && agent.model ? agent.model : DEFAULT_MODEL;
  return { model, usd_per_mtok: { ...USD_PER_MTOK } };
}

// ---------- input ----------

const UserTurnIn = z.union([z.string(), z.looseObject({ source: z.string().optional(), text: z.string() })]).nullable();
const ChatIn = z.looseObject({
  scenario_id: z.string().optional(),
  persona: z.looseObject({}).nullable().optional(),
  lifelog: z.array(z.looseObject({})).optional(),
  history: z.array(z.looseObject({ role: z.enum(['agent', 'user', 'assistant']), text: z.string() })).optional(),
  user_turn: UserTurnIn,
  today: z.string().optional(),
});

function issueLine(issue) {
  const path = issue.path.length ? issue.path.join('.') : '(root)';
  return `${path}: ${issue.message}`;
}

function validateChat(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'request body must be a JSON object' };
  const parsed = ChatIn.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map(issueLine).join('; ') };
  return { ok: true, data: parsed.data };
}

function normalizeTurn(turn) {
  if (turn === null || turn === undefined) return null;
  if (typeof turn === 'string') return { source: 'script', text: turn };
  return { ...turn, source: typeof turn.source === 'string' ? turn.source : 'script', text: String(turn.text) };
}

// Build's request shape → the agent's chat() input; missing fields come from the loaded scenario.
export function chatInput(body, { partnerKey, scenario }) {
  const b = asObject(body);
  const s = asObject(scenario);
  return {
    partnerKey: partnerKey || DEFAULT_PARTNER_KEY,
    scenarioId: typeof b.scenario_id === 'string' ? b.scenario_id : typeof s.id === 'string' ? s.id : undefined,
    persona: b.persona !== undefined ? b.persona : s.persona ?? null,
    lifelog: Array.isArray(b.lifelog) ? b.lifelog : asArray(s.lifelog),
    history: asArray(b.history),
    userTurn: normalizeTurn(b.user_turn),
    today: typeof b.today === 'string' ? b.today : typeof s.today === 'string' ? s.today : undefined,
  };
}

// ---------- handlers ----------

function error(status, code, message, headers) {
  return { status, body: { error: { code, message } }, headers };
}

function usageSummary(agent) {
  const ledger = asObject(agent).ledger;
  let summary = {};
  if (ledger && typeof ledger.summary === 'function') {
    try {
      summary = asObject(ledger.summary());
    } catch {
      summary = {};
    }
  }
  return { partners: asObject(summary.partners), total: asObject(summary.total) };
}

// path + method + parsed JSON body + request context → { status, body, headers? }. Never throws.
export async function handleAgent({ path, method = 'GET', body, partnerKey, agent, scenario, log }) {
  if (path === '/v1/usage') {
    if (method !== 'GET') return error(405, 'method_not_allowed', 'use GET', { Allow: 'GET, OPTIONS' });
    const enabled = agentEnabled({ agent });
    return { status: 200, body: { enabled, ...usageSummary(agent), pricing: pricingOf(agent) } };
  }
  if (path !== '/v1/agent/chat') return error(404, 'not_found', `no agent route for ${path}`);
  if (method !== 'POST') return error(405, 'method_not_allowed', 'use POST', { Allow: 'POST, OPTIONS' });
  if (!agentEnabled({ agent })) {
    return error(503, 'agent_disabled', 'the agent is not enabled on this server (no API key, or BRAIN_AGENT=off)');
  }
  const input = validateChat(body);
  if (!input.ok) return error(400, 'invalid_input', input.error);
  try {
    const result = await agent.chat(chatInput(input.data, { partnerKey, scenario }));
    if (!result || typeof result !== 'object') throw new Error('agent returned no result');
    return { status: 200, body: result };
  } catch (err) {
    // Detail stays on the server; the client gets a generic message and no stack.
    if (typeof log === 'function') log(`${new Date().toISOString()} AGENT_ERROR ${path} ${err instanceof Error ? err.message : String(err)}`);
    return error(502, 'agent_error', 'the agent could not answer this turn');
  }
}

// http.js glue: reads the body for POST, parses JSON, answers. io = { readBody, parseJson, sendJson }
// is injected so this module does not import http.js back.
export function createAgentRoutes({ ctx = {}, brain = {}, bodyLimit, log, readBody, parseJson, sendJson }) {
  return async function serveAgent(req, res, path, method) {
    let body = {};
    if (method === 'POST') {
      const read = await readBody(req, bodyLimit);
      if (read.tooLarge) {
        sendJson(res, 413, { error: { code: 'payload_too_large', message: `body exceeds ${bodyLimit} bytes` } }, { Connection: 'close' });
        return;
      }
      const json = parseJson(read.text);
      if (!json.ok) {
        sendJson(res, 400, { error: { code: 'invalid_json', message: 'request body is not valid JSON' } });
        return;
      }
      body = json.value;
    }
    const out = await handleAgent({
      path,
      method,
      body,
      partnerKey: partnerKeyOf(req.headers),
      agent: ctx.agent,
      scenario: brain.scenario,
      log,
    });
    sendJson(res, out.status, out.body, out.headers ?? {});
  };
}

export default { AGENT_ROUTES, isAgentRoute, partnerKeyOf, agentEnabled, pricingOf, chatInput, handleAgent, createAgentRoutes };
