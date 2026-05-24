import { defineConfig, devices } from '@playwright/test';
import { TEST_TOKEN, TEST_PORT, PROJECT_ROOT, PLUGIN_ROOT } from './e2e/test-constants';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  globalSetup: require.resolve('./e2e/global-setup'),
  use: {
    baseURL: `http://127.0.0.1:${TEST_PORT}`,
    actionTimeout: 5_000,
    trace: 'retain-on-failure',
    extraHTTPHeaders: {
      'x-companion-token': TEST_TOKEN,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${TEST_PORT} --hostname 127.0.0.1`,
    cwd: __dirname,
    url: `http://127.0.0.1:${TEST_PORT}/api/project/tree?token=${TEST_TOKEN}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      AGENTIC_SEO_COMPANION_TOKEN: TEST_TOKEN,
      AGENTIC_SEO_PROJECT_ROOT: PROJECT_ROOT,
      AGENTIC_SEO_PLUGIN_ROOT: PLUGIN_ROOT,
      NODE_ENV: 'development',
    },
  },
});
