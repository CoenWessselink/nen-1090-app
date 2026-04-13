import { expect, type Page } from '@playwright/test';

export async function seedSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('nen1090.session', JSON.stringify({
      token: 'test',
      refreshToken: 'test',
      user: { email: 'admin@demo.com', tenant: 'demo', role: 'ADMIN' },
    }));
  });
}

export async function bootstrapAuthenticatedPage(page: Page, target = '/dashboard') {
  await seedSession(page);
  await page.goto(target, { waitUntil: 'domcontentloaded' });
}

export async function openFirstProject360(page: Page) {
  await bootstrapAuthenticatedPage(page, '/projecten');
  const firstProjectLink = page.locator('a[href*="/projecten/"]').first();
  if (await firstProjectLink.count()) {
    await firstProjectLink.click();
  } else {
    await page.goto('/projecten/e8e89d84-c24d-4334-a56c-61370665a7cf/overzicht', { waitUntil: 'domcontentloaded' });
  }
  await expect(page).toHaveURL(/\/projecten\/.+/i);
}
