import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);
});

test('rapportage opent zonder technische debugteksten', async ({ page }) => {
  await page.goto('/rapportage');
  const body = page.locator('body');
  await expect(body).toContainText(/rapportage|rapport|export/i);
  await expect(body).not.toContainText(/api\/v1|health-check|contract/i);
});

test('instellingen opent zonder raw contractdump', async ({ page }) => {
  await page.goto('/instellingen');
  const body = page.locator('body');
  await expect(body).toContainText(/instellingen|wps|materials|welders|masterdata/i);
  await expect(body).not.toContainText(/api\/v1|raw json/i);
});

test('billing is bereikbaar voor admin', async ({ page }) => {
  await page.goto('/billing');
  await expect(page.locator('body')).toContainText(/billing|abonnement|betal/i);
});
