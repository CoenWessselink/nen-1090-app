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

import type { Request, Response, ConsoleMessage } from '@playwright/test';

export type ErrorCapture = {
  consoleIssues: string[];
  pageErrors: string[];
  requestFailures: string[];
  responseFailures: string[];
  resourceFailures: string[];
};

export function attachErrorCapture(page: Page): ErrorCapture {
  const capture: ErrorCapture = {
    consoleIssues: [],
    pageErrors: [],
    requestFailures: [],
    responseFailures: [],
    resourceFailures: [],
  };

  page.on('console', (msg: ConsoleMessage) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') {
      capture.consoleIssues.push(`${type}: ${text}`);
    }
  });

  page.on('pageerror', (error) => {
    capture.pageErrors.push(error.message);
  });

  page.on('requestfailed', (request: Request) => {
    capture.requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'requestfailed'}`);
  });

  page.on('response', async (response: Response) => {
    const url = response.url();
    const status = response.status();
    if (status >= 400) capture.responseFailures.push(`${status} ${url}`);
    if (!url.includes('/api/') && status >= 400) capture.resourceFailures.push(`${status} ${url}`);
  });

  return capture;
}

export function filterKnownLowValueNoise(lines: string[]) {
  return lines.filter(
    (line) =>
      !/favicon|manifest|sourcemap|source map|deprecated|download the react devtools|cookie “?_ga|cookie “?_gid/i.test(line),
  );
}

export function filterApiFailures(lines: string[]) {
  return lines.filter(
    (line) =>
      !/\/auth\/refresh.*\b(401|403)\b/i.test(line) &&
      !/\/auth\/me.*\b(401|403)\b/i.test(line),
  );
}

export function filterCriticalApiFailures(lines: string[]) {
  return filterApiFailures(lines).filter(
    (line) => /\/api\//i.test(line) && /\b(404|409|410|422|429|500|502|503|504)\b/.test(line),
  );
}

export function filterWeldFlowFailures(lines: string[]) {
  return filterCriticalApiFailures(lines).filter((line) => /\/welds\//i.test(line) || /\/inspection/i.test(line));
}

async function tryClick(locator: Locator) {
  if (!(await locator.count())) return false;
  try {
    await locator.click({ timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function openPotentialWeldDetail(page: Page) {
  const candidates = [
    page.getByRole('button', { name: /las|weld|detail|open/i }).first(),
    page.locator('[data-testid*="weld"]').first(),
    page.locator('tr').filter({ hasText: /las|weld/i }).first(),
    page.locator('button').filter({ hasText: /bekijk|open|detail/i }).first(),
  ];

  for (const locator of candidates) {
    const clicked = await tryClick(locator);
    if (clicked) {
      await page.waitForLoadState('networkidle');
      return true;
    }
  }

  return false;
}

export async function saveEvidence(page: Page, name: string) {
  const safe = name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  await page.screenshot({ path: `test-results/${safe}.png`, fullPage: true });
}
