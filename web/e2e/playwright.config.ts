import { defineConfig } from '@playwright/test';

// Local end-to-end run: two dev servers with the real /api/paths handler and a
// Claude double (server.mjs). One answers with the labelled fallback (no key),
// the other with a fake LLM answer. Each flow runs at laptop and phone width.
// VITE_BRAIN_URL and VITE_BRAIN_URL_BACKUP are empty so the runs never reach the live brain server (Progress shows
// the on-device signals and the offline line).
// Ports can be overridden so two checkouts can run the suite at the same time.
const FALLBACK_PORT = Number(process.env.E2E_FALLBACK_PORT || 5181);
const LLM_PORT = Number(process.env.E2E_LLM_PORT || 5182);

const LAPTOP = { viewport: { width: 1280, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };

export default defineConfig({
  testDir: '.',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  use: {
    browserName: 'chromium',
    headless: true,
    trace: 'off',
  },
  projects: [
    {
      name: 'llm-laptop',
      metadata: { source: 'llm', width: 'laptop' },
      use: { ...LAPTOP, baseURL: `http://127.0.0.1:${LLM_PORT}` },
    },
    {
      name: 'llm-phone',
      metadata: { source: 'llm', width: 'phone' },
      use: { ...PHONE, baseURL: `http://127.0.0.1:${LLM_PORT}` },
    },
    {
      name: 'fallback-laptop',
      metadata: { source: 'fallback', width: 'laptop' },
      use: { ...LAPTOP, baseURL: `http://127.0.0.1:${FALLBACK_PORT}` },
    },
    {
      name: 'fallback-phone',
      metadata: { source: 'fallback', width: 'phone' },
      use: { ...PHONE, baseURL: `http://127.0.0.1:${FALLBACK_PORT}` },
    },
  ],
  webServer: [
    {
      command: 'node server.mjs',
      env: { E2E_PATHS_MODE: 'fallback', E2E_PORT: String(FALLBACK_PORT), VITE_BRAIN_URL: '', VITE_BRAIN_URL_BACKUP: '' },
      url: `http://127.0.0.1:${FALLBACK_PORT}/`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'node server.mjs',
      env: { E2E_PATHS_MODE: 'llm', E2E_PORT: String(LLM_PORT), VITE_BRAIN_URL: '', VITE_BRAIN_URL_BACKUP: '' },
      url: `http://127.0.0.1:${LLM_PORT}/`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
