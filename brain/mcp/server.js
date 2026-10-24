// server.js — MCP surface of the Second Draft brain.
//
// createBrainServer(brain, opts) builds an McpServer that exposes the brain's
// pure functions as MCP tools, the demo scenario as a resource, and one prompt.
//
// BRAIN CONTRACT (what bin.js injects, what tests fake):
//   brain = { think, rankRoles, planWeek, checkIn, analyzeState, explain, scenario }
//   - every function takes exactly ONE plain-object argument (the validated tool
//     input, shapes below) and returns a JSON-serialisable value (sync or async);
//   - `scenario` is the parsed JSON of brain/data/dana-14d.json (synthetic);
//   - this file never imports ../index.js — the object is injected so the MCP
//     layer can be tested with a fake brain and integrated later.
//
// Every tool answers with content [{ type: 'text', text: <JSON> }] plus
// structuredContent (the same value; non-object results are wrapped as { result }).
// Errors never carry stack traces: { error: { code, message } } with isError: true.

import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export const SERVER_NAME = 'second-draft-brain';
export const SERVER_VERSION = pkg.version;
export const SCENARIO_URI = 'brain://scenario/dana';

// --- input shapes (shared by MCP tools and the REST routes in http.js) -------

const AnyObject = z.looseObject({});
const Fields = z.object({
  career: z.string().default('').describe('Career and what went well (field 1)'),
  now: z.string().default('').describe('Current situation and worries (field 2)'),
  pull: z.string().default('').describe('What pulls you now (field 3)')
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
  condition: z.number().int().min(1).max(5).optional().describe('Self-reported condition 1-5'),
  blocker_reason: z.string().optional().describe('Not-today reason chip: time | energy | skill | people | mood')
});
const Checkin = z.looseObject({
  actionId: z.string(),
  kind: z.enum(['done', 'not_today']),
  day: z.string().describe('Demo day of the check-in: Mon..Sun or an ISO date')
});
const Condition = z.number().int().min(1).max(5).describe('Condition 1-5 (input, never guessed)');
const Today = z.string().describe('Demo "today": Mon..Sun or an ISO date. Never the real clock.');

const thinkShape = {
  fields: Fields.optional(),
  lifelog: z.array(LifelogItem).default([]),
  enabledSources: z.array(z.string()).optional(),
  rankedRoles: z.array(AnyObject).optional(),
  path: AnyObject.optional().describe('Chosen path draft (role_id, week.actions[3])'),
  week: AnyObject.optional().describe('Current week state from plan_week / check_in'),
  checkins: z.array(Checkin).default([]),
  condition: Condition.optional(),
  today: Today.optional()
};

// Tool table: name → brain function, description and input shape.
// Order matters: it is the order shown to clients and in /v1/health.
export const TOOLS = [
  {
    name: 'think',
    fn: 'think',
    title: 'Think (one brain pass)',
    description:
      'Run the whole Decision Brain once on the current state: person model, state estimate, goal state, root constraint, today\'s intervention and an explain trace. Deterministic; today/condition are inputs.',
    input: thinkShape
  },
  {
    name: 'rank_roles',
    fn: 'rankRoles',
    title: 'Rank roles',
    description:
      'Extract skills from the three fields and the enabled lifelog, then rank the role catalog by skill overlap (top 3 with what transfers / what is missing).',
    input: {
      fields: Fields.optional(),
      lifelog: z.array(LifelogItem).default([]),
      enabledSources: z.array(z.string()).optional(),
      userSkillIds: z.array(z.string()).optional().describe('Skip extraction and rank these skill ids'),
      skills: z.array(AnyObject).optional().describe('Skill dictionary; defaults to the scenario catalog'),
      roles: z.array(AnyObject).optional().describe('Role catalog; defaults to the scenario catalog')
    }
  },
  {
    name: 'plan_week',
    fn: 'planWeek',
    title: 'Plan this week',
    description: 'Turn a chosen path draft into this week\'s three actions (ids a1-a3, <=30 min each), sized for the given condition.',
    input: {
      path: AnyObject.describe('Path draft with week.actions (or actions)'),
      today: Today,
      condition: Condition.optional()
    }
  },
  {
    name: 'check_in',
    fn: 'checkIn',
    title: 'Check in',
    description:
      'Apply one check-in (done | not_today) to the week. Not today moves the action, never deletes it; the reply follows acknowledge → reframe → 10-minute step.',
    input: {
      week: AnyObject,
      actionId: z.string(),
      kind: z.enum(['done', 'not_today']),
      today: Today,
      checkins: z.array(Checkin).default([]),
      lifelog: z.array(LifelogItem).default([]),
      condition: Condition.optional()
    }
  },
  {
    name: 'analyze_state',
    fn: 'analyzeState',
    title: 'Analyze state',
    description:
      'Estimate the person\'s state from lifelog and check-ins: energy, momentum (EWMA), self-efficacy, capacity minutes, data gap days and a risk score with reasons.',
    input: {
      lifelog: z.array(LifelogItem).default([]),
      checkins: z.array(Checkin).default([]),
      today: Today.optional(),
      condition: Condition.optional()
    }
  },
  {
    name: 'explain',
    fn: 'explain',
    title: 'Explain a decision',
    description:
      'Return the evidence (lifelog / check-in ids) and rule names behind a decision. Pass a decision from think, or the same input as think to recompute and explain.',
    input: {
      decision: AnyObject.optional().describe('A decision / report produced by think'),
      ...thinkShape
    }
  },
  {
    name: 'get_scenario',
    fn: null,
    title: 'Get the demo scenario',
    description: 'Return the 14-day synthetic Dana scenario (labelled synthetic) used by the demo. No real person data.',
    input: {}
  }
];

export const TOOL_NAMES = TOOLS.map((tool) => tool.name);
export const BRAIN_FUNCTIONS = TOOLS.map((tool) => tool.fn).filter(Boolean);

const toolByName = new Map(TOOLS.map((tool) => [tool.name, tool]));

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function toStructured(result) {
  return isPlainObject(result) ? result : { result };
}

function errorMessage(err) {
  if (err instanceof Error) return err.message;
  return String(err);
}

// Validate a raw input (REST body) against a tool's shape. Returns { ok, data | error }.
export function validateInput(name, input) {
  const tool = toolByName.get(name);
  if (!tool) return { ok: false, error: `unknown tool: ${name}` };
  const parsed = z.object(tool.input).safeParse(isPlainObject(input) ? input : {});
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map(issueLine).join('; ') };
  return { ok: true, data: parsed.data };
}

function issueLine(issue) {
  const path = issue.path.length ? issue.path.join('.') : '(root)';
  return `${path}: ${issue.message}`;
}

// Call the brain for a tool with already-validated input. Throws on failure.
export async function invokeBrain(brain, name, input) {
  const tool = toolByName.get(name);
  if (!tool) throw new Error(`unknown tool: ${name}`);
  if (tool.fn === null) {
    if (brain.scenario === undefined) throw new Error('scenario is not loaded');
    return brain.scenario;
  }
  const fn = brain[tool.fn];
  if (typeof fn !== 'function') throw new Error(`${tool.fn} is not available in this brain`);
  return fn(input);
}

function toolResult(result) {
  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
    structuredContent: toStructured(result)
  };
}

function toolError(code, message) {
  const payload = { error: { code, message } };
  return { isError: true, content: [{ type: 'text', text: JSON.stringify(payload) }], structuredContent: payload };
}

const PURE_ANNOTATIONS = { readOnlyHint: true, idempotentHint: true, openWorldHint: false };

const INSTRUCTIONS = [
  'Second Draft Decision Brain: deterministic judgment rules for career second drafts.',
  'Tools never call a network or a clock; pass today and condition as inputs.',
  'Start with get_scenario or the brain://scenario/dana resource for synthetic demo data,',
  'then rank_roles → plan_week → check_in, or think for a full pass with explain.',
  'All demo data is synthetic; never present a skipped check as passed.'
].join(' ');

export function createBrainServer(brain, opts = {}) {
  if (!isPlainObject(brain)) throw new TypeError('createBrainServer: brain must be an object');
  const scenario = opts.scenario ?? brain.scenario;
  const server = new McpServer(
    { name: SERVER_NAME, title: 'Second Draft Brain', version: opts.version ?? SERVER_VERSION },
    { instructions: INSTRUCTIONS }
  );

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      { title: tool.title, description: tool.description, inputSchema: tool.input, annotations: PURE_ANNOTATIONS },
      async (args) => {
        try {
          const result = await invokeBrain({ ...brain, scenario }, tool.name, args ?? {});
          return toolResult(result);
        } catch (err) {
          return toolError('brain_error', errorMessage(err));
        }
      }
    );
  }

  server.registerResource(
    'dana-scenario',
    SCENARIO_URI,
    {
      title: 'Dana 14-day scenario (synthetic)',
      description: 'Sample persona — synthetic. 14 demo days with lifelog, check-ins and conditions. Not a real person.',
      mimeType: 'application/json'
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(scenario ?? null, null, 2) }]
    })
  );

  server.registerPrompt(
    'brain-dump',
    {
      title: 'Brain dump → ranked roles',
      description: 'Fill the three fields in the user\'s own words, then call rank_roles and read the overlap back without judgement.',
      argsSchema: {
        career: z.string().optional().describe('Career and what went well'),
        now: z.string().optional().describe('Current situation and worries'),
        pull: z.string().optional().describe('What pulls you now')
      }
    },
    ({ career = '', now = '', pull = '' }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Here is my brain dump in three fields. Keep my wording; do not rewrite it.',
              `career: ${career || '(empty)'}`,
              `now: ${now || '(empty)'}`,
              `pull: ${pull || '(empty)'}`,
              '',
              'Call the rank_roles tool with fields = { career, now, pull } (use the scenario catalog if I gave no skills or roles).',
              'Then tell me, in three short lines per role, the top roles, what transfers and what is missing.',
              'No ranking advice beyond the overlap numbers; no words like fail, missed, behind, should or must.'
            ].join('\n')
          }
        }
      ]
    })
  );

  return server;
}
