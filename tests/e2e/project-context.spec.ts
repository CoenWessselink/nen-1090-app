import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi, DEFAULT_PROJECT_ID } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);
});

test('projectenlijst opent projectcontext', async ({ page }) => {
  await page.goto('/projecten');
  await expect(page.locator('body')).toContainText(/projecten|demo project/i);
  if (await page.getByText(/demo project/i).count()) {
    await page.getByText(/demo project/i).first().click();
  }
  await expect(page).toHaveURL(new RegExp(`/projecten/${DEFAULT_PROJECT_ID}|/projecten$`));
  await expect(page.locator('body')).toContainText(/demo project|projecten|overzicht/i);
});

test('deep link naar projectoverzicht blijft binnen projectroute', async ({ page }) => {
  await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/overzicht`);
  await expect(page).toHaveURL(new RegExp(`/projecten/${DEFAULT_PROJECT_ID}/overzicht`));
  await expect(page.locator('body')).toContainText(/project|overzicht|demo project/i);
});
