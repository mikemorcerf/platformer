import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 1440, height: 1000 },
    headless: true,
    launchOptions: {
      ...(process.env.CHROMIUM_PATH || (!process.env.CI && existsSync('/usr/bin/chromium'))
        ? { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' } : {}),
      args: ['--no-sandbox']
    }
  },
  webServer: {
    command: 'node server.mjs',
    env: { PORT: '3100' },
    port: 3100,
    reuseExistingServer: !process.env.CI
  }
});
