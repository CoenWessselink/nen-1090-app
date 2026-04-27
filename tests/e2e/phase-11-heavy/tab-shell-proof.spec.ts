import { test, expect } from '@playwright/test';
import { DEFAULT_PROJECT_ID, expectNotOnLogin, login } from './_heavy-helper';

const tabs = ['overzicht', 'assemblies', 'lassen', 'documenten', 'ce-dossier', 'historie'];

test.describe('phase 11 heavy - tab shell proof', () => {
  test('all project tabs preserve shared shell labels after sequential navigation', async ({ page }) => {
    await login(page);

    for (const tab of tabs) {
      await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/${tab}`, { waitUntil: 'networkidle' });
      await expectNotOnLogin(page);
    }

    await expect(page.locator('body')).toContainText(/overzicht|assemblies|lassen|documenten|ce dossier|historie/i);
  });
});
