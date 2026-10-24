#!/usr/bin/env node
// serve.mjs — zero-dependency static server for app/ (node only, no install).
// For teammates with node but no python: ES modules and the browser runner need http, not file://.
//   node scripts/serve.mjs [port]   →   http://localhost:8000/   ·   runner: http://localhost:8000/tests/
// Binds to 127.0.0.1 only. Serves files under app/ and nothing above it.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

export const APP_ROOT = fileURLToPath(new URL('../app/', import.meta.url));

// Resolve a request path inside root; null when it escapes root or cannot be decoded.
export function resolveInside(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  } catch {
    return null;
  }
  const base = resolve(root);
  const target = resolve(join(base, decoded));
  if (target !== base && !target.startsWith(base + sep)) return null;
  return target;
}

export function createStaticServer(root = APP_ROOT) {
  return createServer(async (req, res) => {
    const send = (code, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      res.end(body);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'method not allowed');
    let file = resolveInside(root, req.url || '/');
    if (file === null) return send(403, 'forbidden');
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      return send(200, req.method === 'HEAD' ? '' : body, TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
    } catch {
      return send(404, 'not found');
    }
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.argv[2] || 8000);
  createStaticServer().listen(port, '127.0.0.1', () => {
    console.log(`HTHn app → http://localhost:${port}/   ·   runner → http://localhost:${port}/tests/`);
    console.log('Ctrl+C to stop. Serving app/ only.');
  });
}
