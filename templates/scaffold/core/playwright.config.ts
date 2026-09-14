import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { requireEnv } from './src/utils/env';

// TODO(init): if this app needs an authenticated session, point this at the
// storageState file written by src/global.setup.ts — the project's single
// login. Specs inherit it and never authenticate themselves. Only if this app
// has no authenticated area at all: delete AUTH_FILE, the `storageState` line
// below, and the 'setup' project.
const AUTH_FILE = 'src/auth/{{APP_SLUG}}.json';

// Load environment variables dynamically based on pipeline parameter
const environment = process.env.ENVIRONMENT || 'uat';
const envFile = `.env.${environment}`;
const envPath = path.resolve(__dirname, envFile);

process.stderr.write(`Loading environment configuration: ${envFile}\n`);
dotenv.config({ path: envPath, quiet: true });

// Validate that the environment file exists
if (!fs.existsSync(envPath)) {
  process.stderr.write(`Warning: Environment file ${envFile} not found. Using system environment variables.\n`);
  // Fallback to .env.uat if the specified environment file doesn't exist
  const fallbackPath = path.resolve(__dirname, '.env.uat');
  if (fs.existsSync(fallbackPath)) {
    process.stderr.write(`Falling back to .env.uat\n`);
    dotenv.config({ path: fallbackPath, quiet: true });
  }
}

// Merge .env.local on top (local dev secrets — gitignored).
// CI sets the same vars via injected job env, so this is a no-op there.
const localPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(localPath)) {
  dotenv.config({ path: localPath, override: true, quiet: true });
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './src/tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : 1,
  timeout: 60_000,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    // TODO(allure layer): add ['allure-playwright', { outputFolder: 'allure-results', ... }] here
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: requireEnv('BASE_URL'),

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* Use saved authentication state — remove this line if the app needs no login. */
    storageState: AUTH_FILE,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testDir: './src',
      testMatch: /global\.setup\.ts$/,
      use: {
        storageState: { cookies: [], origins: [] },
        headless: true,
        channel: 'chromium',
      },
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        channel: 'chromium',
        headless: !!process.env.CI,
      },
    },
  ],
});
