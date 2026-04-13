import { test, expect } from '@playwright/test';
import { DEFAULT_PROJECT_ID, login, expectStillAuthenticated } from './_auth-proof-helper';

const routes = [
  `/projecten/${DEFAULT_PROJECT_ID}/overzicht`,
  `/projecten/${DEFAULT_PROJECT_ID}/assemblies`,
  `/projecten/${DEFAULT_PROJECT_ID}/lassen`,
  `/projecten/${DEFAULT_PROJECT_ID}/documenten`,
  `/projecten/${DEFAULT_PROJECT_ID}/ce-dossier`,
  `/projecten/${DEFAULT_PROJECT_ID}/historie`,
];

test.describe('phase 11 expansion - protected route continuity', () => {
  for (const route of routes) {
    test(`route ${route} does not fall back to login after live login`, async ({ page }) => {
      await login(page);
      await page.goto(route, { waitUntil: 'networkidle' });

      await expectStillAuthenticated(page);
      await expect(page.locator('body')).not.toContainText(/log in op het platform|wachtwoord|tenant/i);
    });
  }

  test('tab shell survives sequential route changes', async ({ page }) => {
    await login(page);

    for (const route of routes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      await expectStillAuthenticated(page);
    }

    await expect(page.locator('body')).toContainText(/overzicht|assemblies|lassen|documenten|ce dossier|historie/i);
  });
});
