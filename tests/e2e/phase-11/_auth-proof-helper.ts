import { expect, Page } from '@playwright/test';

export const tenant = process.env.TEST_TENANT || 'demo';
export const email = process.env.TEST_EMAIL || 'admin@demo.com';
export const password = process.env.TEST_PASSWORD || 'Admin123!';
export const DEFAULT_PROJECT_ID = process.env.TEST_PROJECT_ID || '28f5ed98-71b8-4692-83b8-c9df5904489a';

export async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });

  const tenantField = page.locator('input[name="tenant"], input[placeholder*="tenant" i]').first();
  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  const passwordField = page.locator('input[type="password"]').first();
  const button = page
    .locator('button[type="submit"], button:has-text("Login"), button:has-text("Inloggen")')
    .first();

  if (await tenantField.count()) await tenantField.fill(tenant);
  await emailField.fill(email);
  await passwordField.fill(password);
  await button.click();
  await page.waitForLoadState('networkidle');
}

export async function expectAppShell(page: Page) {
  await expect(page).not.toHaveURL(/\/login(?:$|[?#])/);
  await expect(page.locator('body')).not.toContainText(
    /log in op het platform|tenant|e-mail|wachtwoord|inloggen/i,
  );
  await expect(page.locator('body')).toContainText(
    /dashboard|projecten|rapportage|instellingen|overzicht|lassen|documenten|ce dossier/i,
  );
}

export async function expectStillAuthenticated(page: Page) {
  const body = page.locator('body');
  await expect(page).not.toHaveURL(/\/login(?:$|[?#])/);
  await expect(body).not.toContainText(/log in op het platform|wachtwoord|tenant/i);
}

export async function collectApiFailures(page: Page) {
  const issues: string[] = [];
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    if (!url.includes('/api/')) return;

    const allowRefresh = url.includes('/auth/refresh') && [200, 401, 403].includes(status);
    const allowUnauthorizedMe = url.includes('/auth/me') && [200, 401, 403].includes(status);
    if (allowRefresh || allowUnauthorizedMe) return;

    if (status >= 400) issues.push(`${status} ${url}`);
  });
  return issues;
}

export async function snapshotAuthStorage(page: Page) {
  return page.evaluate(() => {
    const ls = window.localStorage.getItem('nen1090.session');
    const ss = window.sessionStorage.getItem('nen1090.session');
    const cookies = document.cookie;
    return { ls, ss, cookies };
  });
}
