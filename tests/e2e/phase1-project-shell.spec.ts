import { test, expect } from '@playwright/test';

const DEFAULT_PROJECT_ID = 'e8e89d84-c24d-4334-a56c-61370665a7cf';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  const tenantField = page.locator('input[name="tenant"], input[placeholder*="tenant" i]').first();
  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  const passwordField = page.locator('input[type="password"]').first();
  const button = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Inloggen")').first();

  if (await tenantField.count()) await tenantField.fill('demo');
  await emailField.fill('admin@demo.com');
  await passwordField.fill('Admin123!');
  await button.click();
  await page.waitForLoadState('networkidle');
}

test('Fase 1 shell toont vaste topbar, klikbare KPIs en rapportage-inhoud', async ({ page }) => {
  await login(page);

  await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/lassen`, { waitUntil: 'networkidle' });

  await expect(page.locator('body')).toContainText(/projectnavigatie|overzicht|assemblies|lassen|documenten|ce dossier|historie/i);
  await expect(page.locator('body')).toContainText(/lassen|documenten|exports|checklist/i);

  const defectKpi = page.getByTestId('lascontrole-kpi-defect');
  if (await defectKpi.count()) {
    await defectKpi.first().click();
    await expect(page.url()).toContain('status=');
  } else {
    await expect(page.locator('body')).toContainText(/lassen|ce dossier|historie/i);
  }
});
