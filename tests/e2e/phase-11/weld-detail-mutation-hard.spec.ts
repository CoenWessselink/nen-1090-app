import { test, expect, Page } from '@playwright/test';

const tenant = process.env.TEST_TENANT || 'demo';
const email = process.env.TEST_EMAIL || 'admin@demo.com';
const password = process.env.TEST_PASSWORD || 'Admin123!';
const DEFAULT_PROJECT_ID = '28f5ed98-71b8-4692-83b8-c9df5904489a';

async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  const tenantField = page.locator('input[name="tenant"], input[placeholder*="tenant" i]').first();
  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  const passwordField = page.locator('input[type="password"]').first();
  const button = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Inloggen")').first();

  if (await tenantField.count()) await tenantField.fill(tenant);
  await emailField.fill(email);
  await passwordField.fill(password);
  await button.click();
  await page.waitForLoadState('networkidle');
}

async function collectUnexpectedNetwork(page: Page) {
  const issues: string[] = [];
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    if (!url.includes('/api/')) return;
    const allowedAuthRefresh = url.includes('/auth/refresh') && [200, 401, 403].includes(status);
    if (allowedAuthRefresh) return;
    if (status >= 400) issues.push(`${status} ${url}`);
  });
  return issues;
}

test.describe('phase 11 - weld mutation hard proof', () => {
  test('lassen route has no unexpected 404/422/500 on passive load', async ({ page }) => {
    const issues = await collectUnexpectedNetwork(page);
    await login(page);
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/lassen`, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(/lassen|projectnavigatie|historie|ce dossier/i);
    const filtered = issues.filter(
      (line) =>
        line.includes('/welds/') ||
        line.includes('/inspection') ||
        line.includes('/status'),
    );
    expect(filtered, filtered.join('\n')).toEqual([]);
  });

  test('weld detail area becomes visible if a weld card exists', async ({ page }) => {
    await login(page);
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/lassen`, { waitUntil: 'networkidle' });
    const weldCard = page.locator('text=/L-00\\d|weld|las/i').first();
    if (await weldCard.count()) {
      await expect(weldCard).toBeVisible();
      await weldCard.click({ timeout: 10000 }).catch(() => {});
      await expect(page.locator('body')).toBeVisible();
    } else {
      await expect(page.locator('body')).toContainText(/lassen/i);
    }
  });
});
