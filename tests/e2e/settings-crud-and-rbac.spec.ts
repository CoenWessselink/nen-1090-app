import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('tenant admin ziet instellingen CRUD en centrale billing handoff', async ({ page }) => {
  await seedSession(page, 'TenantAdmin');
  await stubCommonApi(page);
  await page.goto('/instellingen');
  await page.getByRole('button', { name: /masterdata/i }).click();
  await expect(page.getByText(/crud actief/i).first()).toBeVisible();
  await page.goto('/billing');
  await expect(page.getByText(/centraal via de marketing-shell/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /open centraal abonnement/i })).toBeVisible();
});

test('viewer kan instellingen openen maar geen superadminroute zien', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await seedSession(page, 'VIEWER');
  await stubCommonApi(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: /superadmin/i })).toHaveCount(0);
  await page.goto('/instellingen');
  await expect(page.getByRole('heading', { name: /instellingen/i })).toBeVisible();
  await context.close();
});
