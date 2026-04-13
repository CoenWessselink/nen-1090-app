import { expect, Page, Locator } from '@playwright/test';

export const tenant = process.env.TEST_TENANT || 'demo';
export const email = process.env.TEST_EMAIL || 'admin@demo.com';
export const password = process.env.TEST_PASSWORD || 'Admin123!';
export const DEFAULT_PROJECT_ID = process.env.TEST_PROJECT_ID || '28f5ed98-71b8-4692-83b8-c9df5904489a';

const LOGIN_URL_RE = /\/login(?:$|[?#])/i;
const LOGIN_FORM_TEXT_RE = /log in op het platform|e-?mail|wachtwoord|inloggen/i;
const APP_SHELL_TEXT_RE = /dashboard|projecten|rapportage|instellingen|overzicht|lassen|documenten|ce dossier|historie/i;

async function firstVisible(locators: Locator[]): Promise<Locator | null> {
  for (const locator of locators) {
    try {
      if ((await locator.count()) > 0 && await locator.first().isVisible()) {
        return locator.first();
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export async function waitForPostLogin(page: Page) {
  await expect(page).not.toHaveURL(LOGIN_URL_RE, { timeout: 20000 });

  await expect.poll(async () => {
    const snapshot = await page.evaluate(() => ({
      ls: window.localStorage.getItem('nen1090.session'),
      ss: window.sessionStorage.getItem('nen1090.session'),
      cookies: document.cookie,
    }));
    return Boolean(
      snapshot.ls ||
      snapshot.ss ||
      /nen1090_access_token|nen1090_refresh_token|access_token|auth_token/i.test(snapshot.cookies),
    );
  }, { timeout: 20000 }).toBeTruthy();

  await page.waitForLoadState('networkidle');
}

export async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });

  const tenantField = await firstVisible([
    page.locator('input[name="tenant"]'),
    page.locator('input[placeholder*="tenant" i]'),
  ]);
  const emailField = await firstVisible([
    page.locator('input[type="email"]'),
    page.locator('input[name="email"]'),
  ]);
  const passwordField = await firstVisible([
    page.locator('input[type="password"]'),
  ]);
  const button = await firstVisible([
    page.locator('button[type="submit"]'),
    page.getByRole('button', { name: /login|inloggen/i }),
  ]);

  if (tenantField) await tenantField.fill(tenant);
  if (!emailField || !passwordField || !button) {
    throw new Error('Loginformulier niet volledig gevonden.');
  }

  await emailField.fill(email);
  await passwordField.fill(password);
  await button.click();

  await waitForPostLogin(page);
}

export async function expectNotOnLogin(page: Page) {
  await expect(page).not.toHaveURL(LOGIN_URL_RE, { timeout: 10000 });

  const visibleForm = await firstVisible([
    page.locator('form input[type="password"]'),
    page.locator('form button[type="submit"]'),
    page.getByRole('button', { name: /login|inloggen/i }),
  ]);

  if (visibleForm) {
    await expect(page.locator('body')).not.toContainText(LOGIN_FORM_TEXT_RE);
  }
}

export async function expectAppShell(page: Page) {
  await expectNotOnLogin(page);
  await expect(page.locator('body')).toContainText(APP_SHELL_TEXT_RE);
}

export async function snapshotSession(page: Page) {
  return page.evaluate(() => ({
    local: window.localStorage.getItem('nen1090.session'),
    session: window.sessionStorage.getItem('nen1090.session'),
    cookies: document.cookie,
    url: window.location.pathname + window.location.search + window.location.hash,
    body: document.body?.innerText || '',
  }));
}
