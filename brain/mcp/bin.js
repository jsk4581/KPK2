#!/usr/bin/env node
// bin.js — entry point. `node mcp/bin.js --stdio` speaks MCP over stdio;
// without the flag it serves MCP (/mcp) and REST (/v1/*) over HTTP.
//
// Env: PORT (8787) · HOST (127.0.0.1) · BRAIN_CORS_ORIGINS (comma list, default *)
//      BRAIN_TOKEN (optional bearer token for /mcp and /v1/* except /v1/health)
//      ANTHROPIC_API_KEY (optional; enables the agent: /v1/agent/chat, /v1/usage, LLM /v1/interview)
//      BRAIN_AGENT=off (keep the agent loaded but answer /v1/interview from the script)
// brain/.env (gitignored) is read first: KEY=VALUE lines fill process.env without overriding
// variables already set. Values are never logged.

import { readFileSync } from 'node:fs';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BRAIN_FUNCTIONS, SERVER_NAME, SERVER_VERSION, createBrainServer } from './server.js';
import { startHttp } from './http.js';

const SCENARIO_PATH = new URL('../data/dana-14d.json', import.meta.url);
const ENV_PATH = new URL('../.env', import.meta.url);
const AGENT_MODULE = '../agent/index.js';
const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function fail(message) {
  process.stderr.write(`${SERVER_NAME}: ${message}\n`);
  process.exit(1);
}

function usage() {
  process.stdout.write(
    [
      `${SERVER_NAME} ${SERVER_VERSION}`,
      'usage: node mcp/bin.js [--stdio] [--help]',
      '  --stdio   MCP over stdin/stdout (for Claude Desktop / Claude Code)',
      '  default   HTTP on $PORT (8787): POST /mcp, GET /v1/health, POST /v1/think ...',
      ''
    ].join('\n')
  );
}

async function loadBrain() {
  let mod;
  try {
    mod = await import('../index.js');
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    fail(`cannot load brain/index.js (${detail}). Run the brain integration step first, then start again.`);
  }
  const brain = {};
  const missing = [];
  for (const name of BRAIN_FUNCTIONS) {
    const fn = mod[name] ?? mod.default?.[name];
    if (typeof fn === 'function') brain[name] = fn;
    else missing.push(name);
  }
  if (missing.length) fail(`brain/index.js does not export: ${missing.join(', ')}`);
  // Optional: lets get_scenario / GET /v1/scenario?id= serve the other synthetic scenarios (maya).
  const loader = mod.loadScenario ?? mod.default?.loadScenario;
  if (typeof loader === 'function') brain.loadScenario = loader;
  return brain;
}

function loadScenario() {
  try {
    return JSON.parse(readFileSync(SCENARIO_PATH, 'utf8'));
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${SERVER_NAME}: scenario not loaded (${detail}); get_scenario will report it as missing\n`);
    return { _label: 'synthetic', available: false, note: 'brain/data/dana-14d.json is missing' };
  }
}

// Tiny .env loader: `KEY=VALUE` / `export KEY="VALUE"` lines; blanks and # comments skipped;
// an existing process.env variable always wins. Returns the number of keys set (names only, no values).
function loadDotEnv() {
  let text;
  try {
    text = readFileSync(ENV_PATH, 'utf8');
  } catch {
    return 0;
  }
  let loaded = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    if (!ENV_KEY_RE.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    const quoted = value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")));
    if (quoted) value = value.slice(1, -1);
    if (process.env[key] !== undefined) continue;
    process.env[key] = value;
    loaded += 1;
  }
  return loaded;
}

// The agent module is optional and may be absent: import it lazily, construct it only when a
// key is present, and keep serving (scripted interview) if anything about it fails.
async function loadAgent(brain) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const mod = await import(AGENT_MODULE);
    const create = mod.createAgent ?? mod.default?.createAgent;
    if (typeof create !== 'function') throw new Error(`${AGENT_MODULE} does not export createAgent`);
    const agent = await create({ brain, scenario: brain.scenario });
    if (!agent || typeof agent !== 'object') throw new Error('createAgent returned nothing');
    return agent;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${SERVER_NAME}: agent not loaded (${detail}); /v1/interview stays scripted\n`);
    return null;
  }
}

function parseOrigins(raw) {
  if (!raw) return ['*'];
  const list = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length ? list : ['*'];
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    return;
  }
  loadDotEnv();
  const brain = await loadBrain();
  brain.scenario = loadScenario();

  if (args.includes('--stdio')) {
    const server = createBrainServer(brain);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // stdout is the protocol channel in stdio mode; status goes to stderr.
    process.stderr.write(`${SERVER_NAME} ${SERVER_VERSION} ready on stdio\n`);
    return;
  }

  const port = Number.parseInt(process.env.PORT ?? '8787', 10);
  if (!Number.isFinite(port) || port < 0 || port > 65535) fail(`invalid PORT: ${process.env.PORT}`);
  const token = process.env.BRAIN_TOKEN ?? '';
  const agent = await loadAgent(brain);
  // Status only: the model name is public, the key is never printed.
  const agentState = !agent
    ? 'off'
    : process.env.BRAIN_AGENT === 'off'
      ? `loaded, interview scripted (model ${agent.model ?? 'unknown'})`
      : agent.enabled
        ? `enabled (model ${agent.model ?? 'unknown'})`
        : 'disabled';
  const http = await startHttp({
    brainServerFactory: () => createBrainServer(brain),
    brain,
    port,
    host: process.env.HOST ?? '127.0.0.1',
    corsOrigins: parseOrigins(process.env.BRAIN_CORS_ORIGINS),
    token,
    ctx: { agent }
  });
  process.stdout.write(
    `${SERVER_NAME} ${SERVER_VERSION} listening on ${http.url} (mcp: /mcp, health: /v1/health, auth: ${token ? 'bearer' : 'off'}, agent: ${agentState})\n`
  );

  // Last resort for an internet-exposed demo: every handler already catches its
  // own errors, so anything reaching here slipped through a dependency. Log the
  // detail locally (never to a client) and keep serving instead of exiting.
  const lastResort = (kind) => (err) => {
    const detail = err instanceof Error ? err.stack ?? err.message : String(err);
    process.stderr.write(`${SERVER_NAME}: ${kind} (kept running): ${detail}\n`);
  };
  process.on('uncaughtException', lastResort('uncaught exception'));
  process.on('unhandledRejection', lastResort('unhandled rejection'));

  const shutdown = async (signal) => {
    process.stdout.write(`${SERVER_NAME}: ${signal} received, closing\n`);
    await http.close();
    process.exit(0);
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
