import { Page, expect } from '@playwright/test';

export const DEFAULT_PROJECT_ID = '32220add-082a-46dc-8114-6279a04a3e03';

const demoUser = {
  email: 'admin@demo.com',
  role: 'ADMIN',
  tenant: 'demo',
};

export async function seedSession(page: Page) {
  await page.goto('/login');
  await page.evaluate((user) => {
    const token = 'e2e-demo-token';
    const keys = ['auth_token', 'access_token', 'token', 'jwt'];
    for (const key of keys) {
      localStorage.setItem(key, token);
      sessionStorage.setItem(key, token);
    }
    const userKeys = ['user', 'auth_user', 'current_user'];
    for (const key of userKeys) {
      localStorage.setItem(key, JSON.stringify(user));
      sessionStorage.setItem(key, JSON.stringify(user));
    }
    localStorage.setItem('tenant', user.tenant);
    sessionStorage.setItem('tenant', user.tenant);
  }, demoUser);
}

export async function seedAuth(page: Page) {
  await seedSession(page);
}

export async function bootstrapAuthenticatedPage(page: Page, path = '/projecten') {
  await seedSession(page);
  await page.goto(path);
  await expect(page).not.toHaveURL(/login/);
}

export async function openFirstProject360(page: Page) {
  await bootstrapAuthenticatedPage(page, '/projecten');
  const openBtn = page.getByRole('button', { name: /open project 360/i }).first();
  await openBtn.click();
  await expect(page).toHaveURL(/\/projecten\/.+\/(overzicht)?/);
}

export async function openFirstProjectOverview(page: Page) {
  await openFirstProject360(page);
}

export async function clickSave(page: Page) {
  const labels = [/opslaan/i, /bewaar/i, /save/i, /toevoegen/i, /aanmaken/i];
  for (const label of labels) {
    const btn = page.getByRole('button', { name: label }).first();
    if (await btn.count()) {
      await btn.click();
      return;
    }
  }
  throw new Error('Geen opslaan/bewaar knop gevonden');
}

export async function stubCommonApi(page: Page) {
  await page.route('**/api/v1/**', async route => {
    route.continue();
  });
}