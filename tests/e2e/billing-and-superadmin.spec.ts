import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('billing page shows central subscription handoff', async ({ page }) => {
  await seedSession(page, 'SUPERADMIN');
  await stubCommonApi(page);
  await page.goto('/billing');
  await expect(page.getByRole('heading', { name: /billing/i })).toBeVisible();
  await expect(page.getByText(/centraal abonnement/i)).toBeVisible();
  await expect(page.getByText(/marketing-shell/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /open centraal abonnement/i })).toBeVisible();
});

test('superadmin can open tenant detail and start tenant view', async ({ page }) => {
  await seedSession(page, 'SUPERADMIN');
  await stubCommonApi(page);
  await page.goto('/superadmin');
  await expect(page.getByText(/demo tenant/i)).toBeVisible();
  await page.getByRole('button', { name: /details/i }).click();
  await expect(page.getByText(/tenant detail/i)).toBeVisible();
  await page.getByRole('button', { name: /meekijken/i }).first().click();
  await expect(page.getByText(/tenant-view gestart/i)).toBeVisible();
});
