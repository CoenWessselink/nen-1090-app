import { test } from '@playwright/test';
import { DEFAULT_PROJECT_ID, expectNotOnLogin, login } from './_heavy-helper';

test.describe('phase 11 heavy - direct protected entry after login', () => {
  test('deep link to ce dossier stays authenticated', async ({ page }) => {
    await login(page);
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/ce-dossier`, { waitUntil: 'networkidle' });
    await expectNotOnLogin(page);
  });

  test('deep link to lassen stays authenticated', async ({ page }) => {
    await login(page);
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/lassen`, { waitUntil: 'networkidle' });
    await expectNotOnLogin(page);
  });
});
