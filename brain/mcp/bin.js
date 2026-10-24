#!/usr/bin/env node
// bin.js — entry point. `node mcp/bin.js --stdio` speaks MCP over stdio;
// without the flag it serves MCP (/mcp) and REST (/v1/*) over HTTP.
//
// Env: PORT (8787) · HOST (127.0.0.1) · BRAIN_CORS_ORIGINS (comma list, default *)
//      BRAIN_TOKEN (optional bearer token for /mcp and /v1/* except /v1/health)

import { readFileSync } from 'node:fs';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BRAIN_FUNCTIONS, SERVER_NAME, SERVER_VERSION, createBrainServer } from './server.js';
import { startHttp } from './http.js';

const SCENARIO_PATH = new URL('../data/dana-14d.json', import.meta.url);

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
  const http = await startHttp({
    brainServerFactory: () => createBrainServer(brain),
    brain,
    port,
    host: process.env.HOST ?? '127.0.0.1',
    corsOrigins: parseOrigins(process.env.BRAIN_CORS_ORIGINS),
    token
  });
  process.stdout.write(
    `${SERVER_NAME} ${SERVER_VERSION} listening on ${http.url} (mcp: /mcp, health: /v1/health, auth: ${token ? 'bearer' : 'off'})\n`
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
