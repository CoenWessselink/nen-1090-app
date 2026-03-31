import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi, DEFAULT_PROJECT_ID } from './helpers';

test.describe('weld flow e2e', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, 'ADMIN');
    await stubCommonApi(page);
  });

  test('opens weld overview within project context', async ({ page }) => {
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/lassen`);
    await expect(page.locator('body')).toContainText(/lascontrole|lassen|l-001|demo project/i);
  });

  test('opens inspection view within project context', async ({ page }) => {
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/lascontrole`);
    await expect(page.locator('body')).toContainText(/lascontrole|inspect|l-001|conform/i);
  });

  test('legacy lascontrole route redirects to projecten', async ({ page }) => {
    await page.goto('/lascontrole');
    await expect(page).toHaveURL(/\/projecten$/);
  });
});
