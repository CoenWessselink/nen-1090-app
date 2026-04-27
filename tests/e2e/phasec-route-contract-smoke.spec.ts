import { test, expect } from '@playwright/test';

const appBase = process.env.APP_BASE_URL || 'https://nen-1090-app.pages.dev';
const apiBase = process.env.API_BASE_URL || 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';

async function ensureNoHardCrash(page, path: string) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${appBase}${path}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('Internal Server Error');
  expect(errors.join('\n')).not.toContain('ApiError: Internal Server Error');
}

test('phase c app shell routes do not hard crash', async ({ page }) => {
  await ensureNoHardCrash(page, '/login');
  await ensureNoHardCrash(page, '/billing');
  await ensureNoHardCrash(page, '/superadmin');
  await ensureNoHardCrash(page, '/reports');
});

test('phase c direct health and pdf endpoints respond without 500', async ({ request }) => {
  const endpoints = [
    `${apiBase}/api/v1/health`,
    `${apiBase}/api/v1/projects/01bc8239-020a-4b1b-ba43-00d5c21269ff/exports/compliance/pdf?download=false`,
    `${apiBase}/api/v1/projects/01bc8239-020a-4b1b-ba43-00d5c21269ff/exports/compliance/pdf?download=true`,
  ];

  for (const url of endpoints) {
    const response = await request.get(url);
    expect(response.status(), `${url} returned ${response.status()}`).not.toBe(500);
  }
});
