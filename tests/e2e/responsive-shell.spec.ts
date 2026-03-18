import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('mobile shell opens navigation and keeps primary modules reachable', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Alleen relevant voor mobiele projectconfiguratie.');
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('button', { name: /menu/i }).click();
  await expect(page.getByRole('link', { name: /projecten/i })).toBeVisible();
  await page.getByRole('link', { name: /projecten/i }).click();
  await expect(page.getByRole('heading', { name: /projecten/i })).toBeVisible();
});
