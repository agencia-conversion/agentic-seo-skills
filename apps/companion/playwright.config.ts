import { defineConfig, devices } from '@playwright/test';
import { cpSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = 3030;
const TOKEN = 'e2e-test-token-12345';
const FIXTURE_SOURCE = resolve(__dirname, 'e2e', 'fixtures', 'sample-project');
const PROJECT_ROOT = resolve(__dirname, 'e2e', '.tmp-fixture');
const PLUGIN_ROOT = resolve(__dirname, '..', '..');

// Reset fixture on every run so autosave/log mutations don't leak between runs.
rmSync(PROJECT_ROOT, { recursive: true, force: true });
cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    actionTimeout: 5_000,
    trace: 'retain-on-failure',
    extraHTTPHeaders: {
      'x-companion-token': TOKEN,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 3030 --hostname 127.0.0.1',
    cwd: __dirname,
    url: `http://127.0.0.1:${PORT}/api/project/tree?token=${TOKEN}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      AGENTIC_SEO_COMPANION_TOKEN: TOKEN,
      AGENTIC_SEO_PROJECT_ROOT: PROJECT_ROOT,
      AGENTIC_SEO_PLUGIN_ROOT: PLUGIN_ROOT,
      NODE_ENV: 'development',
    },
  },
});

export const TEST_TOKEN = TOKEN;
