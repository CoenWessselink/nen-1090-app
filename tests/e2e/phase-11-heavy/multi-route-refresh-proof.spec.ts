import { test } from '@playwright/test';
import { DEFAULT_PROJECT_ID, expectNotOnLogin, hardOpen, login } from './_heavy-helper';

const routes = [
  '/dashboard',
  '/projecten',
  '/instellingen',
  `/projecten/${DEFAULT_PROJECT_ID}/overzicht`,
  `/projecten/${DEFAULT_PROJECT_ID}/assemblies`,
  `/projecten/${DEFAULT_PROJECT_ID}/lassen`,
  `/projecten/${DEFAULT_PROJECT_ID}/documenten`,
  `/projecten/${DEFAULT_PROJECT_ID}/ce-dossier`,
  `/projecten/${DEFAULT_PROJECT_ID}/historie`,
];

test.describe('phase 11 heavy - multi route refresh proof', () => {
  for (const route of routes) {
    test(`refresh on ${route} does not dump back to login`, async ({ page }) => {
      await login(page);
      await hardOpen(page, route);
      await page.reload({ waitUntil: 'networkidle' });
      await expectNotOnLogin(page);
    });
  }
});
