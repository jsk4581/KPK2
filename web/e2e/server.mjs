// Local end-to-end server: the Vite dev server plus the real /api/paths handler,
// with the Claude call replaced by a double so no network or key is involved.
//
//   E2E_PATHS_MODE=fallback  no key: the handler answers with the labelled sample output
//   E2E_PATHS_MODE=llm       a fake Claude Messages API answer: the handler answers "llm"
//   E2E_PORT                 port to listen on (default 5181)
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { handlePaths } from '../api/paths.js';
import { fakeClaudeFetch } from './llm-double.mjs';

const webDir = fileURLToPath(new URL('..', import.meta.url));
const mode = process.env.E2E_PATHS_MODE === 'llm' ? 'llm' : 'fallback';
const port = Number(process.env.E2E_PORT || 5181);

function readJson(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => resolve(raw));
    req.on('error', () => resolve('{invalid'));
  });
}

function pathsDouble() {
  return {
    name: 'e2e-api-paths-double',
    configureServer(server) {
      server.middlewares.use('/api/paths', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const raw = await readJson(req);
        // An empty env object means "no key" for the handler, whatever the shell has.
        const options =
          mode === 'llm'
            ? { env: { ANTHROPIC_API_KEY: 'e2e-placeholder' }, fetchImpl: fakeClaudeFetch }
            : { env: {}, fetchImpl: fakeClaudeFetch };
        const result = await handlePaths(raw, options);
        res.statusCode = result.status;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-E2E-Paths-Mode', mode);
        res.end(JSON.stringify(result.body));
      });
    },
  };
}

const server = await createServer({
  root: webDir,
  configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
  plugins: [pathsDouble()],
  server: { host: '127.0.0.1', port, strictPort: true },
  logLevel: 'warn',
});
await server.listen();
console.log(`e2e server (${mode}) on http://127.0.0.1:${port}/`);
