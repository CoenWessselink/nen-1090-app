import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('basis shell laadt zonder zichtbare debug banners', async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);
  await page.goto('/dashboard');
  const body = page.locator('body');
  await expect(body).toContainText(/dashboard|projecten/i);
  await expect(body).not.toContainText(/verbonden|health-check|api status|\/api\/v1/i);
});
