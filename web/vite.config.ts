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
  server: {
    fs: {
      allow: [webDir, appDir],
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.{js,ts}'],
  },
});
