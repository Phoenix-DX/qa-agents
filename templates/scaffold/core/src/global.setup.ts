import { test as setup } from '@playwright/test';
import { LoginPage } from './pages/example/login.page';
import { requireEnv } from './utils/env';

// This is the project's ONE login. Every spec inherits the session from
// AUTH_FILE via storageState and must never log in itself — a spec needing a
// different role or an anonymous session switches with
// test.use({ storageState: ... }). See .claude/docs/framework-rules.md §4.
// TODO(init): only if this app has no authenticated area at all, delete this
// file plus the 'setup' project + storageState line in playwright.config.ts.

export const AUTH_FILE = 'src/auth/{{APP_SLUG}}.json';

setup('authenticate', async ({ page }) => {
  // TODO: credentials are typically per-environment (e.g. APP_ADMIN_USERNAME_UAT,
  // _PROD) since each environment has its own account — adjust the env var
  // names below to match what's set in .env.<environment>.
  const env = (process.env.ENVIRONMENT || 'uat').toUpperCase();

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(requireEnv(`APP_ADMIN_USERNAME_${env}`), requireEnv(`APP_ADMIN_PASSWORD_${env}`));

  await page.context().storageState({ path: AUTH_FILE });
});
