import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('viewer kan superadmin niet openen', async ({ page }) => {
  await seedSession(page, 'VIEWER');
  await stubCommonApi(page);
  await page.goto('/superadmin');
  await expect(page).not.toHaveURL(/\/superadmin$/);
});

test('superadmin ziet tenantbeheer', async ({ page }) => {
  await seedSession(page, 'SUPERADMIN');
  await stubCommonApi(page);
  await page.goto('/superadmin');
  await expect(page.locator('body')).toContainText(/superadmin|tenant|demo tenant/i);
});
