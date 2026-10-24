// agent/index.js — the L3 coach: Claude + Tool Runner over the brain's seven functions, metered.
//
//   import { createAgent } from './agent/index.js'
//   const agent = createAgent({ brain, scenario, apiKey?, model?, client?, ledger? })
//   agent.enabled                      // true when a client or an API key is available
//   await agent.chat({ partnerKey, scenarioId, persona, lifelog, history, userTurn, today })
//     -> { reply: { text }, ready_for_paths, tool_calls, usage, trace, stop_reason }
//   agent.ledger.record / summary      // chat() records every call itself (one row per partnerKey)
//
// Rules this file enforces (not the model):
//   - judgments come from the brain via tools; the tools default their inputs to the conversation's
//     data (lifelog, check-ins, week, path, today) so the model never has to echo it back;
//   - ready_for_paths = user answered READY_TURNS questions OR the reply carries READY_MARKER;
//   - stop_reason 'refusal' -> a fixed reply that says it cannot continue; no tool is run after it;
//   - usage is summed over every loop iteration and priced with pricing.costUsd.
// The API key is read from the option or process.env.ANTHROPIC_API_KEY only; it is never logged.
// Requests are not streamed. Forced tool_choice is never sent (not allowed on claude-opus-5-5).

import { performance } from 'node:perf_hooks';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { DEFAULT_MODEL, addUsage, costUsd, emptyUsage, round6 } from './pricing.js';
import { createLedger } from './ledger.js';
import {
  READY_MARKER,
  READY_TURNS,
  REFUSAL_REPLY,
  SYSTEM_PROMPT,
  buildContextBlock,
  buildMessages,
  countUserTurns,
  stripMarker
} from './prompt.js';

export { READY_MARKER, READY_TURNS, SYSTEM_PROMPT, REFUSAL_REPLY } from './prompt.js';

export const MAX_TOKENS = 2048;
export const MAX_ITERATIONS = 8;
export const EFFORT = 'low';
export const BETAS = Object.freeze(['server-side-fallback-2026-07-01']);
export const TRACE_LAYER = 'L3';
export const TRACE_STAGE = 'interview';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));

// ---------- zod input shapes (mirror brain/mcp/server.js; everything optional because the
// agent fills omitted keys from the conversation context) ----------

const AnyObject = z.looseObject({});
const Fields = z.object({
  career: z.string().optional().describe('Career and what went well (field 1)'),
  now: z.string().optional().describe('Current situation and worries (field 2)'),
  pull: z.string().optional().describe('What pulls you now (field 3)')
});
const LifelogItem = z.looseObject({
  id: z.string(),
  date: z.string().describe('ISO date, e.g. 2026-10-09'),
  source: z.string().describe('calendar | document | photo | note | sms | messenger | saved_link'),
  title: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  url: z.string().nullable().optional(),
  field: z.enum(['career', 'now', 'pull']).optional(),
  condition: z.number().int().min(1).max(5).optional(),
  blocker_reason: z.string().optional()
});
const Checkin = z.looseObject({
  actionId: z.string(),
  kind: z.enum(['done', 'not_today']),
  day: z.string().describe('Demo day of the check-in: Mon..Sun or an ISO date')
});
const Condition = z.number().int().min(1).max(5).describe('Condition 1-5 (an input the person gave, never guessed)');
const Today = z.string().describe('Demo "today": Mon..Sun or an ISO date. Defaults to the conversation\'s demo today.');
const Sources = z.array(z.string()).optional().describe('Enabled lifelog sources (privacy toggles)');
const ArcStart = z.string().optional().describe('ISO date the 12-week arc started');

const OVERRIDE_NOTE = ' Every input is optional and defaults to this conversation\'s data; pass a key only to override it.';

const thinkShape = {
  fields: Fields.optional(),
  lifelog: z.array(LifelogItem).optional(),
  enabledSources: Sources,
  rankedRoles: z.array(AnyObject).optional(),
  path: AnyObject.optional().describe('Chosen path draft (role_id, week.actions[3])'),
  week: AnyObject.optional().describe('Current week state from plan_week / check_in'),
  checkins: z.array(Checkin).optional(),
  condition: Condition.optional(),
  today: Today.optional(),
  arcStart: ArcStart,
  confirmedGates: z.array(z.string()).optional().describe('Gate ids (M1..M4) the person confirmed'),
  freeText: z.union([z.string(), z.array(z.string())]).optional().describe('User-typed notes scanned for crisis language. Never stored.')
};

// Keys each tool takes from the conversation defaults when the model omits them.
const THINK_DEFAULT_KEYS = ['fields', 'lifelog', 'enabledSources', 'path', 'week', 'checkins', 'today', 'arcStart'];

// Tool table: name -> brain function, description, zod shape, default keys. Order is the order sent
// to the API (stable, so the cached prefix stays identical between turns).
export const TOOL_SPECS = [
  {
    name: 'think',
    fn: 'think',
    description:
      'Run the whole Decision Brain once on the current state: person model, state estimate, goal state, root constraint, today\'s intervention (kind, action, minutes, two choices, message) and an explain trace. Deterministic.' + OVERRIDE_NOTE,
    shape: thinkShape,
    defaults: THINK_DEFAULT_KEYS
  },
  {
    name: 'rank_roles',
    fn: 'rankRoles',
    description:
      'Extract skills from the three fields and the enabled lifelog, then rank the role catalog by skill overlap (top 3 with what transfers / what is missing).' + OVERRIDE_NOTE,
    shape: {
      fields: Fields.optional(),
      lifelog: z.array(LifelogItem).optional(),
      enabledSources: Sources,
      userSkillIds: z.array(z.string()).optional().describe('Skip extraction and rank these skill ids')
    },
    defaults: ['fields', 'lifelog', 'enabledSources']
  },
  {
    name: 'plan_week',
    fn: 'planWeek',
    description:
      'Turn a chosen path draft into this week\'s three actions (ids a1-a3, <=30 min each), sized for the given condition.' + OVERRIDE_NOTE,
    shape: {
      path: AnyObject.optional().describe('Path draft with week.actions (or actions)'),
      today: Today.optional(),
      condition: Condition.optional()
    },
    defaults: ['path', 'today']
  },
  {
    name: 'check_in',
    fn: 'checkIn',
    description:
      'Apply one check-in (done | not_today) to the week. Not today moves the action, never deletes it. Returns the updated week plus a fresh brain pass.' + OVERRIDE_NOTE,
    shape: {
      ...thinkShape,
      actionId: z.string().describe('Action id from the week, e.g. a1'),
      kind: z.enum(['done', 'not_today']),
      reason: z.string().optional().describe('Not-today reason chip: time | energy | skill | people | mood')
    },
    defaults: THINK_DEFAULT_KEYS
  },
  {
    name: 'analyze_state',
    fn: 'analyzeState',
    description:
      'Estimate the person\'s state from lifelog and check-ins: energy, momentum (EWMA), self-efficacy, capacity minutes, data gap days and a risk score with reasons and checks (skipped checks stay skipped).' + OVERRIDE_NOTE,
    shape: {
      lifelog: z.array(LifelogItem).optional(),
      checkins: z.array(Checkin).optional(),
      today: Today.optional(),
      condition: Condition.optional(),
      enabledSources: Sources,
      arcStart: ArcStart
    },
    defaults: ['lifelog', 'checkins', 'today', 'enabledSources', 'arcStart']
  },
  {
    name: 'explain',
    fn: 'explain',
    description:
      'Return the evidence (lifelog / check-in ids) and rule names behind a decision. Pass a decision from think, or nothing to recompute and explain today\'s decision.' + OVERRIDE_NOTE,
    shape: {
      decision: AnyObject.optional().describe('A decision / report produced by think'),
      ...thinkShape
    },
    defaults: THINK_DEFAULT_KEYS
  },
  {
    name: 'get_scenario',
    fn: null,
    description:
      'Return the synthetic 14-day demo scenario (labelled synthetic; no real person): persona, fields, path, week, lifelog, check-ins. Skill and role catalogs are omitted.',
    shape: {},
    defaults: []
  }
];

export const TOOL_NAMES = TOOL_SPECS.map((spec) => spec.name);

// ---------- helpers ----------

function definedEntries(input) {
  const out = {};
  for (const [key, value] of Object.entries(isObject(input) ? input : {})) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

// Conversation defaults for tool inputs. Chat arguments win over the scenario file.
function buildDefaults({ scenario, lifelog, today, enabledSources }) {
  const s = isObject(scenario) ? scenario : {};
  const out = {
    fields: s.fields,
    lifelog: Array.isArray(lifelog) ? lifelog : s.lifelog,
    path: s.path,
    week: s.week,
    checkins: s.checkins,
    today: asText(today) || s.today,
    arcStart: s.arc_start ?? s.arcStart,
    enabledSources: Array.isArray(enabledSources) && enabledSources.length ? enabledSources : undefined
  };
  return definedEntries(out);
}

function compactScenario(scenario) {
  if (!isObject(scenario)) throw new Error('scenario is not loaded');
  const { skills, roles, fallback, ...rest } = scenario;
  return { ...rest, _omitted: ['skills', 'roles', 'fallback'] };
}

// Trim brain results for the model: the internal trace is not useful to a coach and costs tokens.
function compactResult(result) {
  if (!isObject(result)) return result;
  const { trace, ...rest } = result;
  if (isObject(rest.brain) && 'trace' in rest.brain) {
    const { trace: innerTrace, ...brain } = rest.brain;
    rest.brain = brain;
  }
  return rest;
}

function errorMessage(err) {
  return err instanceof Error ? err.message : String(err);
}

function textOf(message) {
  return asArray(message && message.content)
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');
}

function toolUseCount(message) {
  return asArray(message && message.content).filter((block) => block && block.type === 'tool_use').length;
}

function ms(start) {
  return Math.max(0, Math.round(performance.now() - start));
}

// ---------- tools ----------

// One betaZodTool per spec. Each run merges conversation defaults under the model's input, calls
// the brain, records { name, ms, ok } into `calls` and a trace entry, and returns a JSON string.
// A failing brain call throws so the runner marks the tool_result is_error (the model is told).
function buildTools({ brain, scenario, defaults, calls, trace }) {
  return TOOL_SPECS.map((spec) =>
    betaZodTool({
      name: spec.name,
      description: spec.description,
      inputSchema: z.object(spec.shape),
      run: async (input) => {
        const start = performance.now();
        try {
          const merged = { ...pick(defaults, spec.defaults), ...definedEntries(input) };
          const result = spec.fn === null ? compactScenario(scenario) : await callBrain(brain, spec.fn, merged);
          const elapsed = ms(start);
          calls.push({ name: spec.name, ms: elapsed, ok: true });
          trace.push({ layer: TRACE_LAYER, stage: TRACE_STAGE, label: `tool ${spec.name}`, status: 'ran', ms: elapsed });
          return JSON.stringify(compactResult(result));
        } catch (err) {
          const elapsed = ms(start);
          calls.push({ name: spec.name, ms: elapsed, ok: false });
          trace.push({ layer: TRACE_LAYER, stage: TRACE_STAGE, label: `tool ${spec.name}: ${errorMessage(err)}`, status: 'ran', ms: elapsed });
          throw new Error(`${spec.name} failed: ${errorMessage(err)}`);
        }
      }
    })
  );
}

function pick(source, keys) {
  const out = {};
  for (const key of keys) if (source[key] !== undefined) out[key] = source[key];
  return out;
}

async function callBrain(brain, fnName, input) {
  const fn = brain && brain[fnName];
  if (typeof fn !== 'function') throw new Error(`${fnName} is not available in this brain`);
  return fn(input);
}

// ---------- agent ----------

export function createAgent(options = {}) {
  const { brain, scenario, model = DEFAULT_MODEL, client: givenClient, ledger: givenLedger } = options;
  if (!isObject(brain)) throw new TypeError('createAgent: brain must be an object with the brain functions');

  const apiKey = asText(options.apiKey) || asText(process.env.ANTHROPIC_API_KEY);
  const enabled = Boolean(givenClient) || apiKey !== '';
  const ledger = givenLedger ?? createLedger();
  let client = givenClient ?? null;

  function getClient() {
    if (client) return client;
    if (!enabled) {
      throw new Error('agent is disabled: no Anthropic client or API key. Set ANTHROPIC_API_KEY in brain/.env or pass { apiKey } / { client }.');
    }
    client = new Anthropic({ apiKey });
    return client;
  }

  async function chat(args = {}) {
    const {
      partnerKey = 'demo',
      scenarioId,
      persona,
      lifelog,
      history = [],
      userTurn = null,
      today,
      enabledSources
    } = isObject(args) ? args : {};
    const api = getClient();

    const defaults = buildDefaults({ scenario, lifelog, today, enabledSources });
    const calls = [];
    const trace = [];
    const tools = buildTools({ brain, scenario, defaults, calls, trace });
    const context = buildContextBlock({
      scenarioId: scenarioId ?? (isObject(scenario) ? scenario.id : undefined),
      persona: persona ?? (isObject(scenario) ? scenario.persona : undefined),
      fields: defaults.fields,
      lifelog: defaults.lifelog,
      checkins: defaults.checkins,
      week: defaults.week,
      today: defaults.today,
      enabledSources: defaults.enabledSources
    });

    // Prompt order on the wire is tools -> system -> messages. The cache breakpoint sits on the
    // stable system block, so tool definitions + system prompt are cached; context and turns are not.
    const params = {
      model,
      max_tokens: MAX_TOKENS,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: context }
      ],
      tools,
      messages: buildMessages({ history, userTurn }),
      betas: [...BETAS],
      fallbacks: 'default',
      output_config: { effort: EFFORT },
      thread: false,
      max_iterations: MAX_ITERATIONS
    };

    const usage = emptyUsage();
    let cost = 0;
    let last = null;
    let turns = 0;
    const runner = api.beta.messages.toolRunner(params);
    let turnStart = performance.now();
    for await (const message of runner) {
      turns += 1;
      addUsage(usage, message.usage);
      cost += costUsd(message.model || model, message.usage);
      last = message;
      trace.push({
        layer: TRACE_LAYER,
        stage: TRACE_STAGE,
        label: `model turn ${turns}: ${message.stop_reason}${toolUseCount(message) ? ` (${toolUseCount(message)} tool call${toolUseCount(message) > 1 ? 's' : ''})` : ''}`,
        status: 'ran',
        ms: ms(turnStart)
      });
      turnStart = performance.now();
    }
    const finalMessage = last ?? (await runner.done());

    // Check the stop reason BEFORE reading content: a refusal has nothing to show.
    const stopReason = finalMessage ? finalMessage.stop_reason : null;
    const refused = stopReason === 'refusal';
    const { text, marked } = refused ? { text: REFUSAL_REPLY, marked: false } : stripMarker(textOf(finalMessage));
    const ready = !refused && (marked || countUserTurns(history, userTurn) >= READY_TURNS);

    const servedModel = finalMessage && finalMessage.model ? finalMessage.model : model;
    const usageOut = { model: servedModel, ...usage, cost_usd: round6(cost) };
    ledger.record(partnerKey, usageOut);

    return {
      reply: { text: text || (refused ? REFUSAL_REPLY : '') },
      ready_for_paths: ready,
      tool_calls: calls,
      usage: usageOut,
      trace,
      stop_reason: stopReason
    };
  }

  return { enabled, model, ledger, tools: [...TOOL_NAMES], chat };
}

export default { createAgent, TOOL_NAMES, TOOL_SPECS, MAX_TOKENS, MAX_ITERATIONS, BETAS };
