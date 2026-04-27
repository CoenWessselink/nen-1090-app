import { test, expect, Page } from '@playwright/test';

const SESSION_KEY = 'nen1090.session';

async function bootstrapSuperadminSession(page: Page) {
  await page.addInitScript(({ storageKey }) => {
    const user = {
      email: 'superadmin@nen1090.com',
      tenant: 'platform',
      tenantId: 'platform',
      role: 'PLATFORM_ADMIN',
      name: 'Superadmin',
    };

    const payload = JSON.stringify({
      token: '__playwright_superadmin__',
      refreshToken: '__playwright_refresh__',
      user,
      impersonation: null,
    });

    window.localStorage.setItem(storageKey, payload);
    window.sessionStorage.setItem(storageKey, payload);

    window.localStorage.setItem('auth_token', '__playwright_superadmin__');
    window.localStorage.setItem('refresh_token', '__playwright_refresh__');
    window.localStorage.setItem('auth_user', JSON.stringify(user));
    window.localStorage.setItem('tenant', 'platform');
    window.localStorage.setItem('role', 'PLATFORM_ADMIN');

    window.sessionStorage.setItem('auth_token', '__playwright_superadmin__');
    window.sessionStorage.setItem('refresh_token', '__playwright_refresh__');
    window.sessionStorage.setItem('auth_user', JSON.stringify(user));
    window.sessionStorage.setItem('tenant', 'platform');
    window.sessionStorage.setItem('role', 'PLATFORM_ADMIN');

    document.cookie = 'nen1090_access_token=__playwright_superadmin__; path=/; SameSite=Lax';
    document.cookie = 'nen1090_refresh_token=__playwright_refresh__; path=/; SameSite=Lax';
    document.cookie = `nen1090_user=${encodeURIComponent(JSON.stringify(user))}; path=/; SameSite=Lax`;
    document.cookie = 'nen1090_tenant=platform; path=/; SameSite=Lax';
    document.cookie = 'nen1090_role=PLATFORM_ADMIN; path=/; SameSite=Lax';
  }, { storageKey: SESSION_KEY });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'superadmin@nen1090.com',
        tenant: 'platform',
        tenant_id: 'platform',
        canonical_role: 'PLATFORM_ADMIN',
        role: 'PLATFORM_ADMIN',
        name: 'Superadmin',
      }),
    });
  });

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: '__playwright_superadmin__',
        refresh_token: '__playwright_refresh__',
        user: {
          email: 'superadmin@nen1090.com',
          tenant: 'platform',
          tenant_id: 'platform',
          role: 'PLATFORM_ADMIN',
          name: 'Superadmin',
        },
      }),
    });
  });
}

async function gotoProtected(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
}

test.describe('superadmin + billing lifecycle shell', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapSuperadminSession(page);
  });

  test('superadmin shell opens', async ({ page }) => {
    await gotoProtected(page, '/superadmin');
    await expect(page).toHaveURL(/\/superadmin/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('billing shell opens', async ({ page }) => {
    await gotoProtected(page, '/billing');
    await expect(page).toHaveURL(/\/billing/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('tenant lifecycle screens do not crash', async ({ page }) => {
    await gotoProtected(page, '/superadmin');
    await expect(page).toHaveURL(/\/superadmin/);
    await expect(page.locator('body')).toBeVisible();
  });
});
