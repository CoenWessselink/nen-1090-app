import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedPage } from './helpers';

test.describe('secondary enterprise pages', () => {
  test('rapportage opens from shell', async ({ page }) => {
    await bootstrapAuthenticatedPage(page, '/rapportage');
    await expect(page.locator('main')).toContainText(/rapportage|export|audit/i);
  });

  test('billing opens from shell', async ({ page }) => {
    await bootstrapAuthenticatedPage(page, '/billing');
    await expect(page.locator('main')).toContainText(/billing|abonnement|betaling|plan/i);
  });

  test('instellingen opens from shell', async ({ page }) => {
    await bootstrapAuthenticatedPage(page, '/instellingen');
    await expect(page.locator('main')).toContainText(/instellingen|security|integratie|wps|lassen/i);
  });
});
