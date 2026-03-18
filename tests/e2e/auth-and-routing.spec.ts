import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('redirects anonymous user to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /cws nen-1090 platform/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /inloggen/i })).toBeVisible();
});

test('shows dashboard for authenticated admin session', async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Demo project')).toBeVisible();
  await expect(page.getByText('WPS-001')).toBeVisible();
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
  await expect(superadminPage.getByRole('heading', { name: /superadmin/i })).toBeVisible();
  await expect(superadminPage.getByText(/demo tenant/i)).toBeVisible();
  await superadminContext.close();
});
