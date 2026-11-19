import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: process.env.E2E_URL ?? 'http://localhost:8080/app/index.html',
    channel: process.env.E2E_BROWSER,
  },
});
