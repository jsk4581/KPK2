import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Shared judgment core (logic.js) and synthetic data live in ../app.
const appDir = fileURLToPath(new URL('../app', import.meta.url));
const webDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': appDir,
    },
  },
  build: {
    // The landing page's module script uses top-level await.
    target: 'es2022',
    rollupOptions: {
      // index.html is the landing page; app.html is the app shown inside its phone.
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app.html', import.meta.url)),
      },
    },
  },
  server: {
    fs: {
      allow: [webDir, appDir],
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    // Keep unit tests off the network even when .env.local sets a brain URL; tests that
    // need one stub it with vi.stubEnv.
    env: { VITE_BRAIN_URL: '' },
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.{js,ts}'],
  },
});
