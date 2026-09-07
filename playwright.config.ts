import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Liverpool Take Home Challenge.
 */
export default defineConfig({
  testDir: './tests',

  /* Allows independent tests to run in parallel */
  fullyParallel: true,

  /* Prevents test.only from accidentally reaching CI */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests only when running in CI */
  retries: process.env.CI ? 2 : 0,

  /* Use one worker in CI for greater stability */
  workers: process.env.CI ? 1 : undefined,

  /* Generate the HTML report required by the challenge */
  reporter: 'html',

  use: {
    /* Save trace information when a test is retried */
    trace: 'on-first-retry',

    /* Automatically capture screenshots when a test fails */
    screenshot: 'only-on-failure',
  },

  /* Start with Chromium for the required E2E flow */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});