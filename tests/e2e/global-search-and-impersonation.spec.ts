import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('global search toont inline resultaten en navigeert naar de juiste module', async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);
  await page.goto('/dashboard');
  await page.getByPlaceholder(/zoek in projecten, lassen, documenten en inspecties/i).fill('Demo');
  await expect(page.getByRole('listbox', { name: /globale zoekresultaten/i })).toBeVisible();
  await page.getByRole('button', { name: /projecten/i }).first().click();
  await expect(page.getByRole('heading', { name: /projecten/i })).toBeVisible();
});

test('superadmin kan tenant-view verlaten via de systeembanner', async ({ page }) => {
  await seedSession(page, 'SUPERADMIN');
  await stubCommonApi(page);
  await page.goto('/superadmin');
  await page.getByRole('button', { name: /meekijken/i }).first().click();
  await expect(page.getByText(/tenant-view gestart/i)).toBeVisible();
  await page.getByRole('button', { name: /verlaat tenant-view/i }).click();
  await expect(page.getByText(/tenant-view beëindigd/i)).toBeVisible();
});
