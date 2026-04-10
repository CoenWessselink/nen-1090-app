import { test, expect } from '@playwright/test';

test('frontend shell en kernroutes antwoorden', async ({ page, baseURL }) => {
  const routes = [
    '/login',
    '/dashboard',
    '/projecten',
    '/rapportage',
  ];

  for (const route of routes) {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  }
});

test('projecten pagina geeft visuele response', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/projecten`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  const text = await page.locator('body').innerText();
  expect(text.length).toBeGreaterThan(0);
});

test('rapportage pagina geeft visuele response', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/rapportage`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  const text = await page.locator('body').innerText();
  expect(text.length).toBeGreaterThan(0);
});
