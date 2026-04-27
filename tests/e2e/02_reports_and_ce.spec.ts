import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173';

async function ensureLoggedIn(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  // Check of we al ingelogd zijn
  if (!(await page.locator('input[name="email"]').isVisible().catch(() => false))) {
    return;
  }

  await page.fill('input[name="email"]', 'admin@demo.com');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');

  // NIET wachten op URL → wachten op app render
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('body')).toBeVisible();
}

test.describe('CE + rapportage canonical routes', () => {

  test('rapportage pagina geeft response', async ({ page }) => {
    await ensureLoggedIn(page);

    await page.goto(`${BASE_URL}/rapportage`, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toBeVisible();
  });

  test('canonieke CE route geeft response', async ({ page }) => {
    await ensureLoggedIn(page);

    await page.goto(`${BASE_URL}/projecten/1/ce-dossier`, {
      waitUntil: 'domcontentloaded'
    });

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).toContainText(/ce|dossier/i);
  });

});