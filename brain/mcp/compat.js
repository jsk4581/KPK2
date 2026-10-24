// compat.js — Build's web↔brain contract (spec §3.2–3.4, §4) served by the same server.
//
// The web demo is stateless towards the server: every call carries everything it needs
// (scenario_id, persona, lifelog[], history[], path, plan, today ...). Judgments come from
// Build's app/logic.js (read-only) and the brain modules; nothing here calls an LLM, the
// network or a clock for a judgment (`today` is an input). The only I/O is one read of
// app/data/persona-dana.json at load time (synthetic fallback copy) and process.hrtime
// for the `ms` of trace steps that actually ran.
//
//   POST /v1/interview   {scenario_id, persona, lifelog[], history[], user_turn}  → {reply:{text}, ready_for_paths, trace[], source}
//                        source is 'agent' when ctx.agent (bin.js, needs ANTHROPIC_API_KEY) answered the
//                        turn (+ usage), 'script' for the fixed question list — also the fallback whenever
//                        the agent throws, with a trace step saying so. BRAIN_AGENT=off forces 'script'.
//   POST /v1/paths       {scenario_id, persona, lifelog[], history[]}             → {paths:[Path×3], trace[]}
//   POST /v1/plan        {…, path: Path, today}                                   → {plan: Plan, trace[]}
//   POST /v1/checkin     {…, path, plan, today, action_id, kind}                  → {plan, message, adjustment, share_card, trace[]}
//   POST /v1/voice/token                                                          → 501 voice_not_enabled
//
// handleCompat(path, body, brain, ctx?) → Promise<{ status, body }>. It never throws; errors are
// { error: { code, message } } (400 malformed input, 409 not_checkable, 501 voice) and no
// stack trace ever reaches a client. http.js keeps CORS, body limit, rate limit and token.
//
// Trace steps: { layer L1..L4, stage, label, status 'ran'|'designed', input_summary,
// output_summary, ms }. 'ran' is only used for steps that executed here (ms is a number);
// designed-only steps (live ingest scrub, ontology graph, condition sizing) are 'designed'
// with ms null — the screen greys them out, we never claim they ran.

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import * as logic from '../../app/logic.js';
import { milestones, nextQuestion } from '../goal.js';
import { render, lint } from '../messages.js';
import { buildPersonModel } from '../person.js';
import { dateOrdinal, isIsoDate, ordinalDate, weekdayOf } from '../state.js';
import { agentEnabled, chatInput } from './agent-routes.js';

export const COMPAT_ROUTES = ['/v1/interview', '/v1/paths', '/v1/plan', '/v1/checkin', '/v1/voice/token'];

// Default week.start when the request carries no arc date (task default; note: a Tuesday).
export const DEFAULT_WEEK_START = '2026-10-20';
export const INTERVIEW_TURNS = 3;

// Build's lifelog sources → logic.js sources. Unlisted sources pass through unchanged.
export const SOURCE_MAP = { message: 'messenger', health: 'note', location: 'note', app_usage: 'note', voice_memo: 'note' };

const SOURCE_LABELS = {
  photo: ['photo', 'photos'],
  saved_link: ['saved link', 'saved links'],
  document: ['document', 'documents'],
  message: ['message', 'messages'],
  messenger: ['message', 'messages'],
  sms: ['text message', 'text messages'],
  health: ['health entry', 'health entries'],
  calendar: ['calendar entry', 'calendar entries'],
  location: ['place', 'places'],
  app_usage: ['app usage entry', 'app usage entries'],
  note: ['note', 'notes'],
  voice_memo: ['voice memo', 'voice memos'],
};

// The fixed interview (≤3 questions). Each answer lands in one of Build's three fields.
export const QUESTIONS = [
  { key: 'what-changed', field: 'now', text: 'What changed in your work this year: what do clients send you now, compared with before?' },
  { key: 'kept-for', field: 'career', text: 'When clients kept you on, what were they really keeping you for?' },
  { key: 'what-pulls', field: 'pull', text: 'What pulls you right now: the part of the work you would keep even if nobody asked for it?' },
];

const NEUTRAL_ACK = 'Thanks, noted.';
const NEUTRAL_TEN_MINUTE = 'the 10-minute version of this step';
const VOICE_MESSAGE = 'Voice input is not enabled for this event build.';

const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (value === null || value === undefined ? '' : String(value));
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const dayIndex = (day) => logic.WEEK_DAYS.indexOf(day);

function sentence(text) {
  const clean = asText(text).replace(/\s+/g, ' ').trim();
  if (clean === '') return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

// ---------- synthetic fallback copy (app/data/persona-dana.json) ----------

const PERSONA_URL = new URL('../../app/data/persona-dana.json', import.meta.url);

const FALLBACK = (() => {
  try {
    const persona = JSON.parse(readFileSync(PERSONA_URL, 'utf8'));
    return { skills: asArray(persona.skills), roles: asArray(persona.roles), paths: asArray(persona.fallback && persona.fallback.paths) };
  } catch {
    return { skills: [], roles: [], paths: [] };
  }
})();

function catalogOf(brain) {
  const scenario = asObject(brain && brain.scenario);
  return {
    skills: asArray(scenario.skills).length > 0 ? scenario.skills : FALLBACK.skills,
    roles: asArray(scenario.roles).length > 0 ? scenario.roles : FALLBACK.roles,
  };
}

function skillNamer(catalog) {
  const names = new Map(asArray(catalog.skills).map((skill) => [asText(skill.id), asText(skill.name) || asText(skill.id)]));
  return (id) => names.get(asText(id)) || asText(id);
}

function fallbackPathFor(roleId) {
  return FALLBACK.paths.find((p) => p && asText(p.role_id) === asText(roleId)) || null;
}

// ---------- input validation (zod v4; unknown keys are kept, the spec allows extras) ----------

const LifelogIn = z.looseObject({
  id: z.string(),
  ts: z.string().optional(),
  date: z.string().optional(),
  source: z.string(),
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  media: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});
const HistoryIn = z.looseObject({
  role: z.enum(['agent', 'user']),
  text: z.string(),
  source: z.enum(['script', 'voice']).optional(),
});
const UserTurnIn = z.looseObject({ source: z.enum(['script', 'voice']), text: z.string() }).nullable();
const Common = {
  scenario_id: z.string().optional(),
  persona: z.looseObject({}).nullable().optional(),
  lifelog: z.array(LifelogIn).default([]),
  history: z.array(HistoryIn).default([]),
};
const PathIn = z.looseObject({
  id: z.string(),
  title: z.string(),
  role_id: z.string().optional(),
  one_liner: z.string().optional(),
  transfers: z.array(z.looseObject({ skill: z.string(), evidence: z.array(z.string()).default([]) })).optional(),
  missing: z.array(z.string()).optional(),
  first_two_weeks: z.array(z.string()).optional(),
});
const ActionIn = z.looseObject({
  id: z.string(),
  title: z.string(),
  minutes: z.number(),
  day: z.string(),
  status: z.enum(['todo', 'done', 'moved']),
  moves: z.number().int().default(0),
  short: z.string().optional(),
});
const PlanIn = z.looseObject({
  path_id: z.string(),
  north_star: z.string().optional(),
  quarter: z.string().optional(),
  week: z.looseObject({ start: z.string().optional(), actions: z.array(ActionIn) }),
  summary: z.string().optional(),
  pending_comeback: z.boolean().optional(),
});

const SCHEMAS = {
  '/v1/interview': z.looseObject({ ...Common, user_turn: UserTurnIn.default(null) }),
  '/v1/paths': z.looseObject(Common),
  '/v1/plan': z.looseObject({ ...Common, path: PathIn, today: z.string() }),
  '/v1/checkin': z.looseObject({
    scenario_id: Common.scenario_id,
    persona: Common.persona,
    path: PathIn,
    plan: PlanIn,
    today: z.string(),
    action_id: z.string(),
    kind: z.enum(['done', 'not_today']),
  }),
};

function issueLine(issue) {
  const path = issue.path.length ? issue.path.join('.') : '(root)';
  return `${path}: ${issue.message}`;
}

function validate(path, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'request body must be a JSON object' };
  const parsed = SCHEMAS[path].safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map(issueLine).join('; ') };
  return { ok: true, data: parsed.data };
}

function error(status, code, message) {
  return { status, body: { error: { code, message } } };
}

// ---------- trace helpers ----------

function ran(trace, layer, stage, label, inputSummary, fn, outputSummary) {
  const started = process.hrtime.bigint();
  const value = fn();
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  trace.push({
    layer,
    stage,
    label,
    status: 'ran',
    input_summary: clip(inputSummary),
    output_summary: clip(typeof outputSummary === 'function' ? outputSummary(value) : asText(outputSummary)),
    ms: Math.round(ms * 100) / 100,
  });
  return value;
}

function designed(trace, layer, stage, label, inputSummary, outputSummary) {
  trace.push({ layer, stage, label, status: 'designed', input_summary: clip(inputSummary), output_summary: clip(outputSummary), ms: null });
}

function clip(text) {
  const s = asText(text);
  return s.length > 240 ? `${s.slice(0, 237)}...` : s;
}

function designedSteps(trace) {
  designed(trace, 'L1', 'scrub', 'Scrub live ingest (PII filter)', 'live lifelog stream', 'Design, not running today: the demo lifelog is synthetic and arrives pre-scrubbed.');
  designed(trace, 'L2', 'graph', 'Ontology graph (skills ↔ roles ↔ evidence)', 'lifelog + skill catalog', 'Design, not running today: overlap is computed on the flat skill catalog instead.');
}

// ---------- lifelog mapping (Build item → logic.js item) ----------

export function mapLifelogItem(item) {
  const raw = asObject(item);
  const source = asText(raw.source);
  const mapped = Object.hasOwn(SOURCE_MAP, source) ? SOURCE_MAP[source] : source;
  const date = isIsoDate(raw.date) ? raw.date : asText(raw.ts).slice(0, 10);
  const tags = asArray(raw.tags).map(asText).filter(Boolean);
  if (mapped !== source && !tags.includes(source)) tags.push(source);
  return {
    ...raw,
    id: asText(raw.id),
    date,
    source: mapped,
    title: asText(raw.title),
    summary: asText(raw.summary),
    tags,
    url: raw.url ?? null,
  };
}

export function mapLifelog(items) {
  return asArray(items).filter((item) => item && typeof item === 'object').map(mapLifelogItem);
}

function sourcesOf(items) {
  return [...new Set(items.map((item) => item.source).filter(Boolean))];
}

function ingest(trace, rawLifelog) {
  return ran(
    trace,
    'L1',
    'ingest',
    'Parse lifelog items',
    `${asArray(rawLifelog).length} items from the web (ts, source, title, summary)`,
    () => mapLifelog(rawLifelog),
    (items) => `${items.length} items → logic shape {id, date, source, tags}; sources: ${sourcesOf(items).join(', ') || 'none'}`,
  );
}

// ---------- interview ----------

function userAnswers(history, userTurn) {
  const answers = asArray(history).filter((h) => h && h.role === 'user').map((h) => asText(h.text));
  if (userTurn && typeof userTurn === 'object') answers.push(asText(userTurn.text));
  return answers;
}

// Answers land in Build's three fields in question order (now, career, pull); extra answers join `now`.
export function fieldsFromHistory(history, userTurn) {
  const fields = { career: '', now: '', pull: '' };
  userAnswers(history, userTurn).forEach((text, i) => {
    const key = QUESTIONS[i] ? QUESTIONS[i].field : 'now';
    fields[key] = [fields[key], text.trim()].filter(Boolean).join(' ');
  });
  return fields;
}

function countBySource(rawLifelog) {
  const counts = new Map();
  for (const item of asArray(rawLifelog)) {
    const source = asText(asObject(item).source) || 'item';
    counts.set(source, (counts.get(source) || 0) + 1);
  }
  return [...counts.entries()].map(([source, n]) => {
    const [one, many] = SOURCE_LABELS[source] || [`${source} item`, `${source} items`];
    return `${n} ${n === 1 ? one : many}`;
  });
}

function greeting(rawLifelog) {
  const n = asArray(rawLifelog).length;
  const first = n > 0
    ? `Already in your agent: ${n} item${n === 1 ? '' : 's'} (${countBySource(rawLifelog).join(', ')}). Nothing to re-type.`
    : 'Nothing is in your agent yet, which is fine: we start from your own words.';
  return `${first}\nOne question to start. ${QUESTIONS[0].text}`;
}

// Reflect the catalog skills heard in the answer (never the answer itself), so the ack cannot shame.
function ackFor(answerText, catalog) {
  const found = logic.extractSkills(asText(answerText), [], catalog.skills).map(skillNamer(catalog));
  if (found.length === 0) return NEUTRAL_ACK;
  return `I hear ${found.slice(0, 2).join(' and ')} in that.`;
}

function scriptedInterview(body, brain) {
  const trace = [];
  const lifelog = ingest(trace, body.lifelog);
  designedSteps(trace);
  const catalog = catalogOf(brain);
  const answers = userAnswers(body.history, body.user_turn);
  const turns = answers.length;
  const ready = turns >= INTERVIEW_TURNS;

  const reply = ran(
    trace,
    'L3',
    'interview',
    'Pick the next interview question',
    `${turns} user turn${turns === 1 ? '' : 's'} so far (history ${asArray(body.history).length}, user_turn ${body.user_turn ? body.user_turn.source : 'null'})`,
    () => {
      if (turns === 0) return { ack: '', sep: '', rest: greeting(body.lifelog), key: QUESTIONS[0].key };
      const ack = ackFor(answers[turns - 1], catalog);
      if (!ready) {
        const q = QUESTIONS[turns];
        return { ack, sep: ' ', rest: q.text, key: q.key };
      }
      // Enough to draft paths. The brain's one next question rides along for the report screen.
      const fields = fieldsFromHistory(body.history, body.user_turn);
      const person = buildPersonModel({ fields, lifelog, skills: catalog.skills, rankedRoles: [], chosenPathId: null, checkins: [] });
      const question = nextQuestion({ person, goalState: 'ambiguous', constraint: null });
      if (turns === INTERVIEW_TURNS) {
        const rest = `That is enough to draft three paths from what you said and what is already in your agent. Tap See my paths when you are ready.\nOne question to keep in mind while you read them: ${question.question}`;
        return { ack, sep: '\n', rest, key: question.key };
      }
      return { ack, sep: ' ', rest: 'Whenever you are ready, tap See my paths.', key: question.key };
    },
    (out) => `turn ${Math.min(turns, INTERVIEW_TURNS)}/${INTERVIEW_TURNS} → ${out.key}; ready_for_paths ${ready}`,
  );

  const text = ran(
    trace,
    'L4',
    'interview',
    'Lint the reply (no shaming words)',
    `${(reply.ack + reply.sep + reply.rest).length} chars`,
    () => {
      const full = `${reply.ack}${reply.sep}${reply.rest}`;
      if (lint(full).ok) return full;
      // The ack reflects catalog skill names; if it ever trips the lint, use the neutral ack.
      return reply.ack ? `${NEUTRAL_ACK}${reply.sep}${reply.rest}` : full;
    },
    (final) => `lint ${lint(final).ok ? 'ok' : 'hits: ' + lint(final).hits.join(', ')}`,
  );

  return { status: 200, body: { reply: { text }, ready_for_paths: ready, trace, source: 'script' } };
}

const elapsedMs = (started) => Math.round((Number(process.hrtime.bigint() - started) / 1e6) * 100) / 100;

function usageLine(usage) {
  const u = asObject(usage);
  const cost = Number.isFinite(Number(u.cost_usd)) ? ` · $${Number(u.cost_usd).toFixed(4)}` : '';
  return `${u.input_tokens ?? '?'} in / ${u.output_tokens ?? '?'} out tokens (cache read ${u.cache_read_input_tokens ?? 0})${cost}`;
}

// Agent turn: the agent's own trace first, then the designed-only steps the scripted path also shows.
function agentInterviewBody(result, started) {
  const text = asText(asObject(result.reply).text).trim();
  if (text === '') throw new Error('agent reply has no text');
  // Same gate as the scripted path: a reply that trips the lint never reaches the person.
  const check = lint(text);
  if (!check.ok) {
    const err = new Error(`agent reply tripped the lint: ${check.hits.join(', ')}`);
    err.code = 'lint';
    throw err;
  }
  const calls = asArray(result.tool_calls);
  const trace = [{
    layer: 'L3',
    stage: 'interview',
    label: 'Agent turn (Claude + brain tools)',
    status: 'ran',
    input_summary: clip(`${calls.length} tool call${calls.length === 1 ? '' : 's'}: ${calls.map((c) => `${asObject(c).name}${asObject(c).ok === false ? ' (failed)' : ''}`).join(', ') || 'none'}`),
    output_summary: clip(`${text.length} chars · ready_for_paths ${result.ready_for_paths === true} · ${usageLine(result.usage)}`),
    ms: elapsedMs(started),
  }];
  trace.push(...asArray(result.trace));
  designedSteps(trace);
  return {
    reply: { text },
    ready_for_paths: result.ready_for_paths === true,
    trace,
    usage: asObject(result.usage),
    tool_calls: calls,
    source: 'agent',
  };
}

async function interview(body, brain, ctx) {
  if (!agentEnabled(ctx)) return scriptedInterview(body, brain);
  const started = process.hrtime.bigint();
  try {
    // The agent's tools take logic-shaped items (date, mapped source), the same mapping the scripted path applies.
    const result = await ctx.agent.chat(chatInput({ ...body, lifelog: mapLifelog(body.lifelog) }, { partnerKey: ctx.partnerKey, scenario: brain.scenario }));
    return { status: 200, body: agentInterviewBody(asObject(result), started) };
  } catch (err) {
    // The detail stays in the server log; the client gets the scripted turn and a trace step saying why.
    if (typeof ctx.log === 'function') ctx.log(`${new Date().toISOString()} AGENT_FALLBACK /v1/interview ${err instanceof Error ? err.message : String(err)}`);
    const scripted = scriptedInterview(body, brain);
    const tripped = err && err.code === 'lint';
    scripted.body.trace.unshift({
      layer: 'L3',
      stage: 'interview',
      label: tripped ? 'Agent reply tripped the lint, scripted question used instead' : 'Agent unavailable, scripted interview used instead',
      status: 'ran',
      input_summary: tripped ? clip(err.message) : 'agent.chat() threw (detail in the server log)',
      output_summary: tripped
        ? 'fell back to the fixed question list; the agent turn is still counted in the usage ledger'
        : 'fell back to the fixed question list; no usage recorded for this turn',
      ms: elapsedMs(started),
    });
    return scripted;
  }
}

// ---------- paths ----------

// skill id → lifelog ids whose title/summary/tags carry that skill (Build's extractSkills, per item).
export function evidenceIndex(lifelog, skills) {
  const index = new Map();
  for (const item of asArray(lifelog)) {
    for (const id of logic.extractSkills('', [item], skills)) {
      if (!index.has(id)) index.set(id, []);
      index.get(id).push(asText(item.id));
    }
  }
  return index;
}

function neutralCopy(role, transfersNames) {
  const lead = transfersNames.length > 0 ? `Build on ${transfersNames.slice(0, 2).join(' and ')}` : 'Start from what you already do';
  return {
    one_liner: `${lead} toward ${role.title}: one small, paid piece of that work at a time.`,
    first_two_weeks: [
      `Talk to one person already doing ${role.title} work for twenty minutes.`,
      'Rework one past piece into the format this role uses.',
    ],
  };
}

function toPath(role, index, evidence, catalog) {
  const nameOf = skillNamer(catalog);
  const transfers = asArray(role.transfers).map((id) => ({ skill: nameOf(id), skill_id: asText(id), evidence: evidence.get(asText(id)) || [] }));
  const missing = asArray(role.missing).map(nameOf);
  const fallback = fallbackPathFor(role.id);
  const copy = fallback ? { one_liner: asText(fallback.one_liner), first_two_weeks: asArray(fallback.first_two_weeks).map(asText) } : neutralCopy(role, transfers.map((t) => t.skill));
  return {
    id: `p${index + 1}`,
    role_id: asText(role.id),
    title: asText(role.title),
    one_liner: copy.one_liner,
    transfers,
    missing,
    first_two_weeks: copy.first_two_weeks,
    ratio: Number.isFinite(Number(role.ratio)) ? Number(role.ratio) : 0,
    copy_source: fallback ? 'fallback' : 'template',
  };
}

// Exactly three roles: rankRoles' top 3, padded from the catalog (ratio 0) when it has fewer.
function threeRoles(ranked, catalog) {
  const out = asArray(ranked).filter((r) => r && typeof r === 'object').slice(0, 3);
  const seen = new Set(out.map((r) => asText(r.id)));
  for (const role of asArray(catalog.roles)) {
    if (out.length >= 3) break;
    if (!role || seen.has(asText(role.id))) continue;
    out.push({ id: asText(role.id), title: asText(role.title), ratio: 0, transfers: [], missing: asArray(role.requires).map(asText) });
    seen.add(asText(role.id));
  }
  while (out.length < 3) out.push({ id: `path-${out.length + 1}`, title: `Path ${out.length + 1}`, ratio: 0, transfers: [], missing: [] });
  return out;
}

function paths(body, brain) {
  const trace = [];
  const lifelog = ingest(trace, body.lifelog);
  designedSteps(trace);
  const catalog = catalogOf(brain);
  const fields = fieldsFromHistory(body.history, null);
  const rankFn = brain && typeof brain.rankRoles === 'function' ? brain.rankRoles : null;

  const ranked = ran(
    trace,
    'L3',
    'paths',
    'Rank roles by skill overlap (brain rankRoles)',
    `fields from ${userAnswers(body.history, null).length} interview answers + ${lifelog.length} lifelog items; ${catalog.roles.length} catalog roles`,
    () => {
      if (rankFn) return rankFn({ fields, lifelog, enabledSources: sourcesOf(lifelog), skills: catalog.skills, roles: catalog.roles });
      const skillIds = logic.extractSkills(fields, lifelog, catalog.skills);
      return { skillIds, roles: logic.rankRoles(skillIds, catalog.roles) };
    },
    (out) => `skills [${asArray(out.skillIds).join(', ')}] → ${asArray(out.roles).map((r) => `${r.id} ${r.ratio}`).join(' · ')}`,
  );

  const evidence = ran(
    trace,
    'L3',
    'paths',
    'Attach lifelog evidence to each transferring skill',
    `${lifelog.length} items × ${catalog.skills.length} skills`,
    () => evidenceIndex(lifelog, catalog.skills),
    (index) => `${index.size} skills with evidence; ${[...index.values()].reduce((n, ids) => n + ids.length, 0)} item links`,
  );

  const list = ran(
    trace,
    'L3',
    'paths',
    'Fill path copy (fallback persona copy or neutral template)',
    'top 3 roles + what transfers / what is missing',
    () => threeRoles(ranked.roles, catalog).map((role, i) => toPath(role, i, evidence, catalog)),
    (out) => `${out.length} paths: ${out.map((p) => `${p.id} ${p.title} (${p.copy_source})`).join(' · ')}`,
  );

  return { status: 200, body: { paths: list, trace } };
}

// ---------- plan ----------

export function resolveToday(value) {
  if (dayIndex(value) >= 0) return value;
  if (isIsoDate(value)) return weekdayOf(value);
  return null;
}

function mondayOf(isoDate) {
  const ordinal = dateOrdinal(isoDate);
  const offset = dayIndex(weekdayOf(isoDate));
  return ordinalDate(ordinal - offset);
}

// week.start: Monday of the scenario arc (week_start / arc_start / persona.arc_start / ISO today), else the default.
export function weekStartOf(body) {
  const b = asObject(body);
  const candidates = [b.week_start, b.arc_start, asObject(b.persona).arc_start, b.today];
  for (const candidate of candidates) if (isIsoDate(candidate)) return mondayOf(candidate);
  return DEFAULT_WEEK_START;
}

function resolveRole(path, catalog) {
  const p = asObject(path);
  const byId = (id) => asArray(catalog.roles).find((r) => r && asText(r.id) === asText(id));
  const title = asText(p.title).trim().toLowerCase();
  return byId(p.role_id) || byId(p.id) || asArray(catalog.roles).find((r) => r && asText(r.title).trim().toLowerCase() === title) || null;
}

// A path with no fallback actions gets three neutral ones from its first_two_weeks lines.
function neutralDraft(path, title) {
  const lines = asArray(path.first_two_weeks).map(asText).filter(Boolean);
  const first = lines[0] || `Talk to one person already doing ${title} work for twenty minutes.`;
  const second = lines[1] || 'Rework one past piece into the format this role uses.';
  return {
    role_id: asText(path.role_id || path.id),
    title,
    week: {
      actions: [
        { title: first, minutes: 30, day: 'Tue', short: 'Write down the first sentence of this step.' },
        { title: second, minutes: 25, day: 'Thu', short: 'Pick the one piece you would rework.' },
        { title: 'Write three lines on what the first two steps taught you', minutes: 20, day: 'Sat', short: 'Write one line.' },
      ],
    },
  };
}

function toPlanAction(action) {
  return {
    id: action.id,
    title: action.title,
    minutes: action.minutes,
    day: action.day,
    status: action.status,
    moves: action.moves,
    short: action.short,
  };
}

function plan(body, brain) {
  const todayWeekday = resolveToday(body.today);
  if (!todayWeekday) return error(400, 'invalid_today', 'today must be Mon..Sun or an ISO date (YYYY-MM-DD)');

  const trace = [];
  const lifelog = ingest(trace, body.lifelog);
  designedSteps(trace);
  const catalog = catalogOf(brain);
  const path = body.path;
  const role = resolveRole(path, catalog);
  const title = asText(path.title) || asText(role && role.title);
  const fallback = role ? fallbackPathFor(role.id) : null;
  const start = weekStartOf(body);

  const week = ran(
    trace,
    'L3',
    'plan',
    'Build this week (logic.buildWeek)',
    `path ${path.id} "${title}" · today ${todayWeekday} · actions from ${fallback ? 'fallback persona copy' : 'neutral template'}`,
    () => logic.buildWeek(fallback ? { role_id: asText(role.id), title, week: fallback.week } : neutralDraft(path, title), todayWeekday),
    (w) => `${w.actions.length} actions: ${w.actions.map((a) => `${a.id} ${a.day} ${a.minutes}m`).join(' · ')} · "${w.summary}"`,
  );

  const gates = ran(
    trace,
    'L3',
    'plan',
    'Three-tier goal (goal.milestones M1–M4)',
    `path "${title}" · week start ${start}`,
    () => milestones({ role_id: asText(role && role.id) || asText(path.id), title }, start),
    (list) => list.map((g) => `${g.id} ${g.name} wk${g.week} ${g.date}`).join(' · '),
  );
  const [m1, m2, m3, m4] = gates;
  const oneLiner = asText(path.one_liner) || asText(fallback && fallback.one_liner);
  const arc = asText(fallback && fallback.arc_12w);
  const northStar = `${title} as your main line of work in one to three years. ${m4.outcome}: ${m4.evidence.toLowerCase()}.${oneLiner ? ` ${oneLiner}` : ''}`;
  const quarter = `${arc ? `${arc} ` : ''}Twelve weeks, three gates: ${[m1, m2, m3].map((g) => `${g.id} ${g.name} (week ${g.week}) ${g.outcome.toLowerCase()}`).join('; ')}.`;

  designed(trace, 'L4', 'adjust', 'Size actions for today\'s condition', 'condition 1–5 (not collected by this web build)', 'Design, not running today: the 10-minute version is used only after a Not today.');

  const out = {
    path_id: asText(path.id),
    north_star: northStar,
    quarter,
    week: { start, actions: week.actions.map(toPlanAction) },
    summary: week.summary,
    pending_comeback: false,
    milestones: gates.map((g) => ({ id: g.id, name: g.name, week: g.week, date: g.date, outcome: g.outcome })),
  };
  return { status: 200, body: { plan: out, trace } };
}

// ---------- checkin ----------

function weekFromPlan(planIn, path, todayWeekday) {
  return {
    actions: asArray(planIn.week.actions).map((a) => ({
      id: asText(a.id),
      title: asText(a.title),
      minutes: Number(a.minutes),
      day: asText(a.day),
      status: a.status,
      moves: Number(a.moves) || 0,
      short: asText(a.short).trim() || asText(a.title),
    })),
    summary: asText(planIn.summary),
    pathId: asText(planIn.path_id),
    pathTitle: asText(asObject(path).title),
    today: todayWeekday,
    pendingComeback: planIn.pending_comeback === true,
  };
}

// Spec §3.4 move rule, written independently of logic.js so the two can be compared:
// target = the day after max(action.day, today); the last remaining checkable action (latest
// weekday among todo|moved non-NextWeek; ties = all on that day) or a target past Sunday → NextWeek.
export function specMoveTarget(week, action, today) {
  const checkable = logic.checkableActions(week);
  const lastIndex = Math.max(...checkable.map((a) => dayIndex(a.day)));
  const from = dayIndex(action.day);
  if (from === lastIndex) return { to: logic.NEXT_WEEK, reason: 'last-action' };
  const target = Math.max(from, dayIndex(today)) + 1;
  if (target >= logic.WEEK_DAYS.length) return { to: logic.NEXT_WEEK, reason: 'past-sunday' };
  return { to: logic.WEEK_DAYS[target], reason: 'next-day' };
}

function nextOpenAction(week, todayWeekday) {
  const open = logic.checkableActions(week);
  const todayIndex = dayIndex(todayWeekday);
  const sorted = [...open].sort((a, b) => dayIndex(a.day) - dayIndex(b.day));
  return sorted.find((a) => dayIndex(a.day) >= todayIndex) || sorted[0] || null;
}

function checkin(body, brain) {
  void brain;
  const todayWeekday = resolveToday(body.today);
  if (!todayWeekday) return error(400, 'invalid_today', 'today must be Mon..Sun or an ISO date (YYYY-MM-DD)');

  const week = weekFromPlan(body.plan, body.path, todayWeekday);
  const action = week.actions.find((a) => a.id === body.action_id);
  if (!action) return error(400, 'unknown_action', `no action "${body.action_id}" in plan.week.actions`);
  if (!logic.checkableActions(week).some((a) => a.id === action.id)) {
    const why = action.status === 'done' ? 'already done' : 'scheduled for next week';
    return error(409, 'not_checkable', `action ${action.id} is ${why}; it has no Done / Not today buttons`);
  }

  const trace = [];
  const result = ran(
    trace,
    'L3',
    'checkin',
    `Apply check-in (logic.applyCheckin): ${body.kind}`,
    `${action.id} "${action.title}" ${action.day} ${action.status} moves ${action.moves} · today ${todayWeekday}`,
    () => logic.applyCheckin(week, action.id, body.kind, todayWeekday),
    (r) => (r.ok ? `${r.reason}${r.adjustment ? ` ${r.adjustment.fromDay} → ${r.adjustment.toDay} (${r.adjustment.reason})` : ''} · summary "${r.week.summary}"` : `refused: ${r.reason}`),
  );
  if (!result.ok) {
    // Reachable only if logic.js refuses something the checks above let through.
    if (result.reason === 'not-checkable') return error(409, 'not_checkable', `action ${action.id} cannot be checked in`);
    return error(400, 'invalid_input', `check-in refused: ${result.reason}`);
  }

  let next = result.week;
  let adjustment = null;
  let shareCard = null;
  let message = null;

  if (body.kind === 'not_today') {
    // Verify Build's move against the spec rule. They agree today (same algorithm); if they ever
    // diverge, the spec rule is applied on top of logic.js's week and the trace says so.
    const expected = ran(
      trace,
      'L4',
      'adjust',
      'Verify the move against spec §3.4',
      `max(${action.day}, ${todayWeekday}) + 1; last remaining action or past Sunday → NextWeek`,
      () => specMoveTarget(week, action, todayWeekday),
      (e) => {
        const got = result.adjustment.toDay;
        return e.to === got ? `${e.reason} → ${e.to}; logic.js matches the spec rule` : `${e.reason} → ${e.to}; spec rule applied over logic.js (${got})`;
      },
    );
    if (expected.to !== result.adjustment.toDay) {
      next = { ...next, actions: next.actions.map((a) => (a.id === action.id ? { ...a, day: expected.to } : a)) };
      next.summary = logic.weekSummary(next.actions);
    }
    const moved = next.actions.find((a) => a.id === action.id);
    adjustment = { action_id: action.id, from: action.day, to: moved.day, reason: 'not_today' };

    message = ran(
      trace,
      'L4',
      'checkin',
      'Write the Not today reply (messages.render REST + lint)',
      'ack → reframe → 10-minute version → move note',
      () => {
        const doneCount = next.actions.filter((a) => a.status === 'done').length;
        const rendered = render('REST', {
          action: action.title,
          done: doneCount,
          planned: next.actions.length,
          moved_day: action.day,
          next_day: moved.day === logic.NEXT_WEEK ? 'next week' : moved.day,
          micro_title: action.short,
        });
        let ten = sentence(action.short || action.title);
        if (!lint(ten).ok) ten = sentence(NEUTRAL_TEN_MINUTE);
        const movedLine = moved.day === logic.NEXT_WEEK ? 'Moved to next week' : `Moved to ${moved.day}`;
        const text = [rendered.ack, rendered.reframe, `If you have 10 minutes: ${ten}`, movedLine].join('\n');
        return { text, ten_minute_action: ten, lint: lint(text) };
      },
      (m) => `${m.text.split('\n').length} lines · lint ${m.lint.ok ? 'ok' : 'hits: ' + m.lint.hits.join(', ')}`,
    );
  } else {
    shareCard = ran(
      trace,
      'L4',
      'adjust',
      'Share card gate (first Done of the week only)',
      `done before: ${week.actions.filter((a) => a.status === 'done').length}`,
      () => (result.shareCard
        ? {
          headline: `Working on: ${asText(week.pathTitle) || 'a new path'}`,
          body: `Just did: ${sentence(action.title)} ${result.shareCard.progress}.`,
          copy_text: result.shareCard.text,
        }
        : null),
      (card) => (card ? 'first Done → share card (path title, finished action, progress only)' : 'not the first Done → no card'),
    );
    message = ran(
      trace,
      'L4',
      'checkin',
      'Write the Done reply (acknowledge, comeback line if any) + lint',
      `${action.id} done${result.comeback ? ' after a Not today' : ''}`,
      () => {
        const open = nextOpenAction(next, todayWeekday);
        const text = lint(result.message).ok ? result.message : `Done: ${sentence(NEUTRAL_TEN_MINUTE)}`;
        return { text, ten_minute_action: open ? sentence(open.short || open.title) : null, lint: lint(text) };
      },
      (m) => `lint ${m.lint.ok ? 'ok' : 'hits: ' + m.lint.hits.join(', ')}`,
    );
  }

  const planOut = {
    ...body.plan,
    path_id: asText(body.plan.path_id),
    week: { ...body.plan.week, start: asText(body.plan.week.start) || weekStartOf(body), actions: next.actions.map(toPlanAction) },
    summary: next.summary,
    pending_comeback: next.pendingComeback === true,
  };

  return {
    status: 200,
    body: {
      plan: planOut,
      message: message ? { text: message.text, ten_minute_action: message.ten_minute_action } : null,
      adjustment,
      share_card: shareCard,
      trace,
    },
  };
}

// ---------- dispatch ----------

export function isCompatRoute(path) {
  return COMPAT_ROUTES.includes(path);
}

const HANDLERS = { '/v1/interview': interview, '/v1/paths': paths, '/v1/plan': plan, '/v1/checkin': checkin };

// path + parsed JSON body + the injected brain (+ ctx {agent, partnerKey, log}) → { status, body }. Never throws.
export async function handleCompat(path, rawBody, brain, ctx = {}) {
  if (path === '/v1/voice/token') return error(501, 'voice_not_enabled', VOICE_MESSAGE);
  const handler = HANDLERS[path];
  if (!handler) return error(404, 'not_found', `no compat route for ${path}`);
  const input = validate(path, rawBody);
  if (!input.ok) return error(400, 'invalid_input', input.error);
  try {
    return await handler(input.data, asObject(brain), asObject(ctx));
  } catch (err) {
    // Message only; the stack stays on the server.
    return error(500, 'compat_error', err instanceof Error ? err.message : String(err));
  }
}

export default { COMPAT_ROUTES, isCompatRoute, handleCompat };
