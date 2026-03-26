import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('redirects anonymous user to login', async ({ page }) => {
  await page.goto('/dashboard');
  const current = page.url();
  expect(current).not.toMatch(/\/dashboard$/i);
});

test('shows dashboard for authenticated admin session', async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);
  await page.goto('/dashboard');

  const body = page.locator('body');
  await expect(body).toBeVisible();
  await expect(body).toContainText(/dashboard|demo project|projecten|lascontrole/i);
});

test('superadmin route is hidden for viewer and accessible for superadmin', async ({ browser }) => {
  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await seedSession(viewerPage, 'VIEWER');
  await stubCommonApi(viewerPage);
  await viewerPage.goto('/dashboard');
  await expect(viewerPage.getByRole('link', { name: /superadmin/i })).toHaveCount(0);
  await viewerContext.close();

  const superadminContext = await browser.newContext();
  const superadminPage = await superadminContext.newPage();
  await seedSession(superadminPage, 'SUPERADMIN');
  await stubCommonApi(superadminPage);
  await superadminPage.goto('/superadmin');
  await expect(superadminPage.locator('body')).toContainText(/superadmin|tenant|demo/i);
  await superadminContext.close();
});
