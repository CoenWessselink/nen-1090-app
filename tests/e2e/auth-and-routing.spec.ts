import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('redirects anonymous user to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/login|auth|sign-in|signin/i);
});

test('shows dashboard for authenticated admin session', async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);
  await page.goto('/dashboard');

  const possibleHeadings = [
    page.getByRole('heading', { name: /dashboard/i }),
    page.getByText(/dashboard/i).first(),
  ];

  let matchedHeading = false;
  for (const heading of possibleHeadings) {
    try {
      await expect(heading).toBeVisible({ timeout: 3000 });
      matchedHeading = true;
      break;
    } catch {}
  }

  expect(matchedHeading).toBeTruthy();
  await expect(page.getByText(/demo project/i)).toBeVisible();
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

  const possibleSignals = [
    superadminPage.getByRole('heading', { name: /superadmin/i }),
    superadminPage.getByText(/demo tenant/i),
    superadminPage.getByText(/tenant/i).first(),
  ];

  let matched = false;
  for (const signal of possibleSignals) {
    try {
      await expect(signal).toBeVisible({ timeout: 3000 });
      matched = true;
      break;
    } catch {}
  }

  expect(matched).toBeTruthy();
  await superadminContext.close();
});
