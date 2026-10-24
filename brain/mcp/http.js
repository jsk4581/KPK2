// http.js — node:http front door for the brain: MCP Streamable HTTP on /mcp
// plus a small REST surface under /v1. No express, no sessions.
//
//   POST   /mcp              JSON-RPC → fresh McpServer + stateless transport per request
//   GET    /mcp              405 (stateless server has no standalone SSE stream to offer)
//   DELETE /mcp              handled by the transport (nothing to close; answers 200)
//   GET    /v1/health        { ok, name, version, tools, uptimeSec }   (never needs a token)
//   POST   /v1/think | /v1/rank-roles | /v1/plan-week | /v1/check-in | /v1/analyze-state | /v1/explain
//   GET    /v1/scenario      scenario JSON
//
// Cross-cutting: CORS on every response (incl. OPTIONS preflight), optional
// bearer token, 120 req/min per client, 64KB body limit, one log line per request.
// Error bodies are { error: { code, message } } and never include stack traces.
//
// Exposure notes (the server sits behind a Cloudflare quick tunnel, so every
// request reaches it from loopback):
//   - client identity for rate limiting comes from CF-Connecting-IP first (set by
//     Cloudflare, not spoofable through the tunnel); X-Forwarded-For is trusted only
//     for its LAST hop and only when the peer is loopback (a local proxy). A client
//     talking to the port directly can still pick its own key — that is the tradeoff
//     of having no shared secret with the proxy, and direct access is local-only.
//   - JSON bodies are parsed with a reviver that drops __proto__ / constructor /
//     prototype keys, so no downstream merge can be turned into prototype pollution.
//   - MCP batches are capped at MAX_BATCH messages (clients on 2025-06-18+ never batch).
//   - slow clients hit Node's headersTimeout / requestTimeout; oversized uploads get
//     413 with Connection: close so the socket is dropped instead of drained.

import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SERVER_NAME, SERVER_VERSION, TOOL_NAMES, invokeBrain, validateInput } from './server.js';
import { handleCompat, isCompatRoute } from './compat.js';

export const BODY_LIMIT_BYTES = 64 * 1024;
export const RATE_LIMIT = { limit: 120, windowMs: 60_000 };
export const MAX_BATCH = 20;
export const RATE_MAP_MAX_KEYS = 10_000;
export const TIMEOUTS = { headersTimeoutMs: 15_000, requestTimeoutMs: 30_000 };

const ALLOW_METHODS = 'GET,POST,DELETE,OPTIONS';
const ALLOW_HEADERS = 'Content-Type, Authorization, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID';
// scheme://host[:port] with no path, whitespace or userinfo; 'null' is what browsers send for opaque origins.
const ORIGIN_RE = /^[a-z][a-z0-9+.-]*:\/\/[^\s/\\?#@]{1,253}$/i;
const ORIGIN_MAX = 256;
const IP_RE = /^[0-9a-f.:]{1,64}$/i;
const RATE_KEY_MAX = 64;
const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// REST path → tool name (same validation and brain call as the MCP tool).
export const REST_ROUTES = {
  '/v1/think': 'think',
  '/v1/rank-roles': 'rank_roles',
  '/v1/plan-week': 'plan_week',
  '/v1/check-in': 'check_in',
  '/v1/analyze-state': 'analyze_state',
  '/v1/explain': 'explain'
};

const noop = () => {};

function defaultLog(line) {
  process.stdout.write(`${line}\n`);
}

function sendJson(res, status, body, extraHeaders = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  res.end(text);
}

function sendError(res, status, code, message, extraHeaders) {
  sendJson(res, status, { error: { code, message } }, extraHeaders);
}

// Only a well-formed Origin is ever echoed back; anything else is treated as absent.
export function normalizeOrigin(value) {
  if (typeof value !== 'string' || value.length > ORIGIN_MAX) return null;
  if (value === 'null' || ORIGIN_RE.test(value)) return value;
  return null;
}

export function applyCors(req, res, corsOrigins) {
  const origin = normalizeOrigin(req.headers.origin);
  const allowAll = corsOrigins.includes('*');
  let allow = null;
  if (allowAll) allow = origin ?? '*';
  else if (origin && corsOrigins.includes(origin)) allow = origin;
  if (allow) res.setHeader('Access-Control-Allow-Origin', allow);
  // Restricted mode answers differ per Origin, so caches must key on it even when we deny.
  if (!allowAll || allow !== '*') res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', ALLOW_METHODS);
  res.setHeader('Access-Control-Allow-Headers', ALLOW_HEADERS);
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  res.setHeader('Access-Control-Max-Age', '600');
}

function isLoopback(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function asIp(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return IP_RE.test(text) ? text : null;
}

// Rate-limit key. Trust order: CF-Connecting-IP → last X-Forwarded-For hop (loopback
// peer only, i.e. a local proxy appended it) → socket address. The FIRST X-Forwarded-For
// entry is client-controlled and is never used.
export function clientIp(req) {
  const peer = req.socket?.remoteAddress || 'unknown';
  const cf = asIp(req.headers['cf-connecting-ip']);
  if (cf) return cf;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && isLoopback(peer)) {
    const hops = forwarded.split(',');
    const last = asIp(hops[hops.length - 1]);
    if (last) return last;
  }
  return peer.slice(0, RATE_KEY_MAX);
}

// Fixed-window counter per key, bounded to `maxKeys` entries. Expired entries are
// pruned once per window; if the map is still over the cap (a flood of distinct keys)
// the oldest entries are evicted down to 90% of the cap so pruning stays amortised.
// Returns { limited, retryAfterSec }.
export function createRateLimiter({ limit, windowMs, maxKeys = RATE_MAP_MAX_KEYS }) {
  const hits = new Map();
  let nextPrune = 0;
  function prune(now) {
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    const floor = Math.floor(maxKeys * 0.9);
    if (hits.size > maxKeys) {
      for (const key of hits.keys()) {
        if (hits.size <= floor) break;
        hits.delete(key);
      }
    }
    nextPrune = now + windowMs;
  }
  return {
    hit(key, now = Date.now()) {
      if (now >= nextPrune || hits.size > maxKeys) prune(now);
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        if (entry) hits.delete(key); // re-insert so Map order reflects window start
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      return { limited: entry.count > limit, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
    },
    get size() {
      return hits.size;
    }
  };
}

export function isAuthorized(req, token) {
  if (!token) return true;
  const header = req.headers.authorization;
  if (typeof header !== 'string') return false;
  const [scheme, ...rest] = header.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== 'bearer') return false;
  const given = Buffer.from(rest.join(' '));
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Read the request body up to `limit` bytes. Oversized bodies are not kept; the
// caller answers 413 with Connection: close so Node drops the socket instead of
// draining the rest of the upload.
export function readBody(req, limit = BODY_LIMIT_BYTES) {
  return new Promise((resolve, reject) => {
    const declared = Number.parseInt(req.headers['content-length'] ?? '', 10);
    if (Number.isFinite(declared) && declared > limit) {
      resolve({ text: '', tooLarge: true });
      return;
    }
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };
    req.on('data', (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        chunks.length = 0;
        finish(resolve, { text: '', tooLarge: true });
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => finish(resolve, { text: tooLarge ? '' : Buffer.concat(chunks).toString('utf8'), tooLarge }));
    req.on('error', (err) => finish(reject, err));
    req.on('close', () => finish(reject, new Error('request closed before body ended')));
  });
}

// JSON.parse with a reviver that removes keys able to reach Object.prototype.
function reviveSafe(key, value) {
  return FORBIDDEN_JSON_KEYS.has(key) ? undefined : value;
}

export function parseJson(text) {
  if (text.trim() === '') return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text, reviveSafe) };
  } catch {
    return { ok: false };
  }
}

function jsonRpcError(res, status, code, message) {
  sendJson(res, status, { jsonrpc: '2.0', error: { code, message }, id: null });
}

function safeLogPath(path) {
  return path.replace(/[^\x21-\x7e]/g, '?').slice(0, 200);
}

export function startHttp({
  brainServerFactory,
  brain,
  port = 8787,
  host = '127.0.0.1',
  corsOrigins = ['*'],
  token = '',
  rateLimit = RATE_LIMIT,
  bodyLimit = BODY_LIMIT_BYTES,
  timeouts = TIMEOUTS,
  log = defaultLog
} = {}) {
  if (typeof brainServerFactory !== 'function') throw new TypeError('startHttp: brainServerFactory is required');
  if (!brain || typeof brain !== 'object') throw new TypeError('startHttp: brain is required');

  const origins = Array.isArray(corsOrigins) && corsOrigins.length ? corsOrigins : ['*'];
  const limiter = createRateLimiter(rateLimit);
  const startedAt = Date.now();

  async function handleMcp(req, res, parsedBody) {
    const server = brainServerFactory();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      enableDnsRebindingProtection: false
    });
    // 'close' fires after the response finishes as well as on an aborted
    // connection, so the per-request server and transport are always released.
    res.once('close', () => {
      transport.close().catch(noop);
      server.close().catch(noop);
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, parsedBody);
  }

  function tooLarge(res) {
    sendError(res, 413, 'payload_too_large', `body exceeds ${bodyLimit} bytes`, { Connection: 'close' });
  }

  async function handleRest(req, res, toolName) {
    const body = await readBody(req, bodyLimit);
    if (body.tooLarge) {
      tooLarge(res);
      return;
    }
    const json = parseJson(body.text);
    if (!json.ok) {
      sendError(res, 400, 'invalid_json', 'request body is not valid JSON');
      return;
    }
    const input = validateInput(toolName, json.value);
    if (!input.ok) {
      sendError(res, 400, 'invalid_input', input.error);
      return;
    }
    try {
      const result = await invokeBrain(brain, toolName, input.data);
      sendJson(res, 200, result === undefined ? null : result);
    } catch (err) {
      sendError(res, 500, 'brain_error', err instanceof Error ? err.message : String(err));
    }
  }

  async function route(req, res) {
    let path;
    try {
      path = new URL(req.url ?? '/', 'http://localhost').pathname;
    } catch {
      sendError(res, 400, 'bad_request', 'malformed request target');
      return;
    }
    const method = req.method ?? 'GET';

    applyCors(req, res, origins);
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const rate = limiter.hit(clientIp(req));
    if (rate.limited) {
      sendError(res, 429, 'rate_limited', 'too many requests', { 'Retry-After': String(rate.retryAfterSec) });
      return;
    }

    if (path === '/' && method === 'GET') {
      sendJson(res, 200, {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        mcp: '/mcp',
        rest: ['/v1/health', '/v1/scenario', ...Object.keys(REST_ROUTES)]
      });
      return;
    }

    if (path === '/v1/health') {
      if (method !== 'GET') {
        sendError(res, 405, 'method_not_allowed', 'use GET', { Allow: 'GET, OPTIONS' });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        name: SERVER_NAME,
        version: SERVER_VERSION,
        tools: TOOL_NAMES,
        uptimeSec: Math.round((Date.now() - startedAt) / 1000)
      });
      return;
    }

    const protectedRoute = path === '/mcp' || path.startsWith('/v1/');
    if (protectedRoute && !isAuthorized(req, token)) {
      sendError(res, 401, 'unauthorized', 'bearer token required', { 'WWW-Authenticate': `Bearer realm="${SERVER_NAME}"` });
      return;
    }

    // Build's web↔brain contract (/v1/interview, /v1/paths, /v1/plan, /v1/checkin, /v1/voice/token)
    // is dispatched to compat.js before the tool routes; same body limit, JSON parsing and error shape.
    if (isCompatRoute(path)) {
      if (method !== 'POST') {
        sendError(res, 405, 'method_not_allowed', 'use POST', { Allow: 'POST, OPTIONS' });
        return;
      }
      const body = await readBody(req, bodyLimit);
      if (body.tooLarge) {
        tooLarge(res);
        return;
      }
      const json = parseJson(body.text);
      if (!json.ok) {
        sendError(res, 400, 'invalid_json', 'request body is not valid JSON');
        return;
      }
      const out = handleCompat(path, json.value, brain);
      sendJson(res, out.status, out.body);
      return;
    }

    if (path === '/mcp') {
      if (method === 'POST') {
        const body = await readBody(req, bodyLimit);
        if (body.tooLarge) {
          tooLarge(res);
          return;
        }
        const json = parseJson(body.text);
        if (!json.ok || body.text.trim() === '') {
          jsonRpcError(res, 400, -32700, 'Parse error: Invalid JSON');
          return;
        }
        if (Array.isArray(json.value) && json.value.length > MAX_BATCH) {
          jsonRpcError(res, 400, -32600, `Invalid Request: batch must not exceed ${MAX_BATCH} messages`);
          return;
        }
        await handleMcp(req, res, json.value);
        return;
      }
      if (method === 'DELETE') {
        await handleMcp(req, res);
        return;
      }
      sendJson(
        res,
        405,
        { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed: stateless server, POST only.' }, id: null },
        { Allow: 'POST, DELETE, OPTIONS' }
      );
      return;
    }

    if (path === '/v1/scenario') {
      if (method !== 'GET') {
        sendError(res, 405, 'method_not_allowed', 'use GET', { Allow: 'GET, OPTIONS' });
        return;
      }
      if (brain.scenario === undefined) {
        sendError(res, 404, 'scenario_missing', 'scenario is not loaded');
        return;
      }
      sendJson(res, 200, brain.scenario);
      return;
    }

    const toolName = Object.hasOwn(REST_ROUTES, path) ? REST_ROUTES[path] : undefined;
    if (toolName) {
      if (method !== 'POST') {
        sendError(res, 405, 'method_not_allowed', 'use POST', { Allow: 'POST, OPTIONS' });
        return;
      }
      await handleRest(req, res, toolName);
      return;
    }

    sendError(res, 404, 'not_found', `no route for ${method} ${path}`);
  }

  const server = createServer(
    {
      headersTimeout: timeouts.headersTimeoutMs,
      requestTimeout: timeouts.requestTimeoutMs,
      connectionsCheckingInterval: 5_000
    },
    (req, res) => {
      const started = process.hrtime.bigint();
      const path = safeLogPath((req.url ?? '/').split('?')[0]);
      res.once('close', () => {
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        log(`${new Date().toISOString()} ${req.method} ${path} ${res.statusCode} ${ms.toFixed(1)}ms`);
      });
      route(req, res).catch((err) => {
        // Detail goes to the log only; the client sees a generic message.
        log(`${new Date().toISOString()} ERROR ${req.method} ${path} ${err instanceof Error ? err.message : String(err)}`);
        if (res.destroyed) return;
        if (!res.headersSent) sendError(res, 500, 'internal_error', 'internal error');
        else res.destroy();
      });
    }
  );

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      const address = server.address();
      const boundPort = typeof address === 'object' && address ? address.port : port;
      resolve({
        server,
        port: boundPort,
        url: `http://${host}:${boundPort}`,
        close: () =>
          new Promise((done) => {
            server.closeAllConnections?.();
            server.close(() => done());
          })
      });
    });
  });
}
