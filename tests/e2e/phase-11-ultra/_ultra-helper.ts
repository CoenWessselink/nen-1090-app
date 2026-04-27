import { expect, type ConsoleMessage, type Page, type Request } from '@playwright/test';

export const DEFAULT_PROJECT_ID = process.env.TEST_PROJECT_ID || 'demo-project';
export const desktopViewport = { width: 1440, height: 900 };
export const mobileViewport = { width: 390, height: 844 };

const TENANT = process.env.TEST_TENANT || 'demo';
const EMAIL = process.env.TEST_EMAIL || 'admin@demo.com';
const PASSWORD = process.env.TEST_PASSWORD || 'Admin123!';

const LOGIN_RE = /\/login(?:$|[?#])/i;
const APP_SHELL_RE = /dashboard|projecten|rapportage|instellingen|overzicht|lassen|documenten|ce dossier|historie/i;
const LOGIN_FORM_RE = /inloggen|login|tenant|e-?mail|wachtwoord/i;

async function fillIfPresent(page: Page, selectors: string[], value: string) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      try {
        await locator.fill(value);
        return true;
      } catch {
        // continue
      }
    }
  }
  return false;
}

export async function collectConsoleIssues(page: Page) {
  const issues: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') issues.push(`${type}: ${msg.text()}`);
  });
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`));
  return issues;
}

export async function collectApiFailures(page: Page) {
  const issues: string[] = [];
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    if (!url.includes('/api/')) return;
    const allowRefresh = url.includes('/auth/refresh') && [200, 401, 403].includes(status);
    const allowMe = url.includes('/auth/me') && [200, 401, 403].includes(status);
    if (allowRefresh || allowMe) return;
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
    requests.push({ url, auth: request.headers()['authorization'] || null });
  });
  return requests;
}

export async function expectNotOnLogin(page: Page) {
  await expect(page).not.toHaveURL(LOGIN_RE, { timeout: 15000 });
}

export async function expectAppShell(page: Page) {
  await expectNotOnLogin(page);
  await expect(page.locator('body')).toContainText(APP_SHELL_RE, { timeout: 15000 });
  await expect(page.locator('body')).not.toContainText(LOGIN_FORM_RE);
}

export async function saveRouteScreenshot(page: Page, name: string) {
  const safe = name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  await page.screenshot({ path: `test-results/${safe}.png`, fullPage: true });
}

export async function expireLocalSession(page: Page) {
  await page.evaluate(() => {
    const keys = ['nen1090.session', 'auth_token', 'access_token', 'token', 'refresh_token'];
    for (const key of keys) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
    document.cookie = 'nen1090_access_token=; path=/; max-age=0';
    document.cookie = 'nen1090_refresh_token=; path=/; max-age=0';
  });
}

export async function corruptLocalSession(page: Page) {
  await page.evaluate(() => {
    window.localStorage.setItem('nen1090.session', '{"token":"broken","user":null}');
    window.sessionStorage.setItem('nen1090.session', '{"token":"broken","user":null}');
    window.localStorage.setItem('auth_token', 'broken');
    window.sessionStorage.setItem('auth_token', 'broken');
  });
}

export async function login(page: Page) {
  page.setDefaultTimeout(15000);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await fillIfPresent(page, ['input[name="tenant"]', 'input[placeholder*="tenant" i]'], TENANT);
  const emailFilled = await fillIfPresent(page, ['input[name="email"]', 'input[type="email"]'], EMAIL);
  const passwordFilled = await fillIfPresent(page, ['input[name="password"]', 'input[type="password"]'], PASSWORD);
  if (!emailFilled || !passwordFilled) throw new Error('Login fields not found in ultra helper.');

  const submitCandidates = [
    page.locator('button[type="submit"]').first(),
    page.getByRole('button', { name: /inloggen|login/i }).first(),
  ];

  let submitted = false;
  for (const button of submitCandidates) {
    if (await button.count()) {
      try {
        await button.click();
        submitted = true;
        break;
      } catch {}
    }
  }
  if (!submitted) throw new Error('Login submit button not found in ultra helper.');

  await page.waitForLoadState('domcontentloaded');
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch {}
}
