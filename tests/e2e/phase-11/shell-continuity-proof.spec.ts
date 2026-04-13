import { test, expect } from '@playwright/test';
import { DEFAULT_PROJECT_ID, login, expectStillAuthenticated } from './_auth-proof-helper';

test.describe('phase 11 expansion - shell continuity proof', () => {
  test('sidebar and topbar remain visible after refresh inside project shell', async ({ page }) => {
    await login(page);
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/overzicht`, { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });

    await expectStillAuthenticated(page);
    await expect(page.locator('body')).toContainText(/projecten|overzicht|assemblies|lassen|documenten|historie/i);
  });

  test('settings survives hard navigation after login', async ({ page }) => {
    await login(page);
    await page.goto('/instellingen', { waitUntil: 'networkidle' });

    await expectStillAuthenticated(page);
    await expect(page.locator('body')).toContainText(/instellingen|wps|materials|welders|templates/i);
  });

  test('lassen survives hard navigation after login', async ({ page }) => {
    await login(page);
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/lassen`, { waitUntil: 'networkidle' });

    await expectStillAuthenticated(page);
    await expect(page.locator('body')).toContainText(/lassen|ce dossier|historie|project/i);
  });
});
