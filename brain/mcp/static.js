// static.js — serves the Brain Explorer page and anything else inside brain/mcp/public.
//
//   serveStatic(req, res, { root })   GET/HEAD only; answers every request it is given.
//     GET /            → <root>/explorer.html
//     GET /explorer    → <root>/explorer.html
//     GET /public/<f>  → <root>/<f>          (also plain /<f>, e.g. /explorer.html)
//     anything else    → 404 { error: { code: 'not_found' } }
//
// Safety: the URL path is percent-decoded, resolved against `root`, and rejected unless the
// resolved path AND its realpath (symlinks followed) stay inside `root`. Directories, NUL
// bytes and non-GET methods are refused. Error bodies use the same { error: { code, message } }
// shape as http.js and never include a filesystem path. No caching layer, no directory listing.
//
// http.js wiring (one dispatch line in route(), before the /v1 token check):
//   if (isStaticRoute(path)) return serveStatic(req, res, { root: PUBLIC_DIR });

import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url));
export const INDEX_FILE = 'explorer.html';

export const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const NOT_FOUND_CODES = new Set(['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'EISDIR', 'ENAMETOOLONG', 'ELOOP']);

// Paths http.js should hand to serveStatic.
export function isStaticRoute(path) {
  return path === '/' || path === '/explorer' || path.startsWith('/public/');
}

export function contentTypeOf(file) {
  return CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

function inside(root, candidate) {
  return candidate === root || candidate.startsWith(root + sep);
}

// URL pathname → absolute file path under `root`, or null when the request must be refused.
// Pure string work (no filesystem); the realpath check happens in serveStatic.
export function resolvePublicPath(pathname, root = PUBLIC_DIR) {
  if (typeof pathname !== 'string' || pathname === '') return null;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\') || decoded === '/public') return null;
  let relative;
  if (decoded === '/' || decoded === '/explorer') relative = INDEX_FILE;
  else if (decoded.startsWith('/public/')) relative = decoded.slice('/public/'.length);
  else relative = decoded.replace(/^\/+/, '');
  if (relative === '' || relative.endsWith('/')) return null;
  const rootAbs = resolve(root);
  const file = resolve(rootAbs, relative);
  if (file === rootAbs || !inside(rootAbs, file)) return null;
  return file;
}

function send(res, status, headers, body, headOnly) {
  res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache', ...headers });
  res.end(headOnly ? undefined : body);
}

function sendError(res, status, code, message, extra = {}) {
  const text = JSON.stringify({ error: { code, message } });
  send(res, status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(text), ...extra }, text, false);
}

// Always answers the response. Resolves to true once the response has been written.
export async function serveStatic(req, res, { root = PUBLIC_DIR } = {}) {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    sendError(res, 405, 'method_not_allowed', 'use GET', { Allow: 'GET, HEAD, OPTIONS' });
    return true;
  }
  let pathname;
  try {
    pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  } catch {
    sendError(res, 404, 'not_found', 'malformed request target');
    return true;
  }
  const file = resolvePublicPath(pathname, root);
  if (!file) {
    sendError(res, 404, 'not_found', `no static file for ${method} ${pathname.slice(0, 200)}`);
    return true;
  }
  try {
    const [rootReal, fileReal] = await Promise.all([realpath(resolve(root)), realpath(file)]);
    if (!inside(rootReal, fileReal) || fileReal === rootReal) throw Object.assign(new Error('outside root'), { code: 'ENOENT' });
    const info = await stat(fileReal);
    if (!info.isFile()) throw Object.assign(new Error('not a file'), { code: 'ENOENT' });
    const body = await readFile(fileReal);
    send(res, 200, { 'Content-Type': contentTypeOf(fileReal), 'Content-Length': body.length }, body, method === 'HEAD');
  } catch (err) {
    if (NOT_FOUND_CODES.has(err?.code)) sendError(res, 404, 'not_found', `no static file for ${method} ${pathname.slice(0, 200)}`);
    else sendError(res, 500, 'static_error', 'could not read the static file');
  }
  return true;
}

export default { PUBLIC_DIR, INDEX_FILE, CONTENT_TYPES, isStaticRoute, contentTypeOf, resolvePublicPath, serveStatic };
