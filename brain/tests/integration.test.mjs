// integration.test.mjs — the real brain behind the real server: spawns mcp/bin.js on an
// ephemeral port, hits /v1/health and /v1/think with the synthetic scenario, then speaks MCP
// (tools/list, tools/call think) through the SDK client. The child is closed at the end.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import { think, loadScenario } from '../index.js';
import { TOOL_NAMES } from '../mcp/server.js';

const BIN = new URL('../mcp/bin.js', import.meta.url);
const scenario = loadScenario();
// What a client sends (the tool input shape); the catalog comes from the brain's fallback.
const thinkInput = { fields: scenario.fields, lifelog: scenario.lifelog, path: scenario.path, week: scenario.week, checkins: scenario.checkins, today: scenario.today };

let child;
let base;
let stdout = '';
let stderr = '';

function waitForListening(proc, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`server did not start in ${timeoutMs}ms\n${stdout}\n${stderr}`)), timeoutMs);
    proc.stdout.on('data', (chunk) => {
      stdout += chunk;
      const m = /listening on (http:\/\/[^\s]+)/.exec(stdout);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    });
    proc.stderr.on('data', (chunk) => { stderr += chunk; });
    proc.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early (code ${code})\n${stdout}\n${stderr}`));
    });
  });
}

before(async () => {
  child = spawn(process.execPath, [BIN.pathname], {
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1', BRAIN_TOKEN: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  base = await waitForListening(child);
});

after(async () => {
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});

test('GET /v1/health answers with the 8 tools', async () => {
  const res = await fetch(`${base}/v1/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.name, 'dream-achieve-moments-brain');
  assert.deepEqual(body.tools, TOOL_NAMES);
});

test('POST /v1/think with the scenario equals think() in-process (day 14: green, full)', async () => {
  const res = await fetch(`${base}/v1/think`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(thinkInput)
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.state.risk.level, 'green');
  assert.ok(['full', 'comeback'].includes(body.intervention.kind));
  assert.equal(body.constraint.constraint, scenario.expected.rootConstraint);
  assert.equal(body.intervention.message.lint.ok, true);
  assert.deepEqual(body, JSON.parse(JSON.stringify(think(thinkInput))));
});

test('POST /v1/think with a bad shape → 400 invalid_input', async () => {
  const res = await fetch(`${base}/v1/think`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkins: [{ actionId: 'a1', kind: 'skip', day: 'Thu' }] })
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, 'invalid_input');
});

test('GET /v1/scenario is the synthetic scenario', async () => {
  const res = await fetch(`${base}/v1/scenario`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body._label, 'synthetic');
  assert.equal(body.id, scenario.id);
});

test('MCP: tools/list and tools/call think through the SDK client', async () => {
  const client = new Client({ name: 'integration-test', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`));
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name), TOOL_NAMES);

    const result = await client.callTool({ name: 'think', arguments: thinkInput });
    assert.notEqual(result.isError, true);
    assert.equal(result.content[0].type, 'text');
    const report = result.structuredContent;
    assert.deepEqual(JSON.parse(result.content[0].text), report);
    assert.equal(report.state.risk.level, 'green');
    assert.ok(['full', 'comeback'].includes(report.intervention.kind));
    assert.deepEqual(report, JSON.parse(JSON.stringify(think(thinkInput))));

    const analyzed = await client.callTool({ name: 'analyze_state', arguments: { lifelog: scenario.lifelog, checkins: scenario.checkins, today: scenario.today } });
    assert.equal(analyzed.structuredContent.risk.level, 'green');

    const got = await client.callTool({ name: 'get_scenario', arguments: {} });
    assert.equal(got.structuredContent._label, 'synthetic');
  } finally {
    await client.close();
  }
});
