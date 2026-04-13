import { expect, Page, Request } from '@playwright/test';

export const tenant = process.env.TEST_TENANT || 'demo';
export const email = process.env.TEST_EMAIL || 'admin@demo.com';
export const password = process.env.TEST_PASSWORD || 'Admin123!';
export const DEFAULT_PROJECT_ID = process.env.TEST_PROJECT_ID || '28f5ed98-71b8-4692-83b8-c9df5904489a';

export const desktopViewport = { width: 1440, height: 900 };
export const mobileViewport = { width: 390, height: 844 };

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

export async function expectNotOnLogin(page: Page) {
  await expect(page).not.toHaveURL(/\/login(?:$|[?#])/);
  await expect(page.locator('body')).not.toContainText(
    /log in op het platform|tenant|e-mail|wachtwoord|inloggen/i,
  );
}

export async function expectAppShell(page: Page) {
  await expectNotOnLogin(page);
  await expect(page.locator('body')).toContainText(
    /dashboard|projecten|rapportage|instellingen|overzicht|lassen|documenten|ce dossier|historie/i,
  );
}

export async function snapshotSession(page: Page) {
  return page.evaluate(() => ({
    local: window.localStorage.getItem('nen1090.session'),
    session: window.sessionStorage.getItem('nen1090.session'),
    cookies: document.cookie,
    url: window.location.pathname + window.location.search + window.location.hash,
  }));
}

export async function collectConsoleIssues(page: Page) {
  const issues: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      issues.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    issues.push(`pageerror: ${error.message}`);
  });
  return issues;
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

export async function captureAuthRequests(page: Page) {
  const requests: Array<{ url: string; auth: string | null }> = [];
  page.on('request', (request: Request) => {
    const url = request.url();
    if (!url.includes('/api/')) return;
    if (!url.includes('/auth/me') && !url.includes('/auth/refresh')) return;
    requests.push({
      url,
      auth: request.headers()['authorization'] || null,
    });
  });
  return requests;
}

export async function hardOpen(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'networkidle' });
  await expectNotOnLogin(page);
}

export async function assertStoragePresent(page: Page) {
  const snapshot = await snapshotSession(page);
  expect(
    Boolean(
      snapshot.local ||
      snapshot.session ||
      /nen1090_access_token|nen1090_refresh_token|access_token|auth_token/i.test(snapshot.cookies),
    ),
  ).toBeTruthy();
}

export async function expireLocalSession(page: Page) {
  await page.evaluate(() => {
    window.localStorage.removeItem('nen1090.session');
    window.sessionStorage.removeItem('nen1090.session');
    document.cookie = 'nen1090_access_token=; path=/; max-age=0';
  });
}

export async function corruptLocalSession(page: Page) {
  await page.evaluate(() => {
    window.localStorage.setItem('nen1090.session', '{"token":"broken","user":null}');
    window.sessionStorage.setItem('nen1090.session', '{"token":"broken","user":null}');
  });
}

export async function saveRouteScreenshot(page: Page, name: string) {
  const safe = name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  await page.screenshot({
    path: `test-results/${safe}.png`,
    fullPage: true,
  });
}
