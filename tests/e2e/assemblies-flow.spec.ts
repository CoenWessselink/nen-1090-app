import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi, DEFAULT_PROJECT_ID } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);
});

test('assemblies zijn bereikbaar binnen projectcontext', async ({ page }) => {
  await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/assemblies`);
  await expect(page).toHaveURL(new RegExp(`/projecten/${DEFAULT_PROJECT_ID}/assemblies`));
  await expect(page.locator('body')).toContainText(/assembl|portaalframe|a-001|demo project/i);
});
