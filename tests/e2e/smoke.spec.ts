import { expect, test } from '@playwright/test';

const marketingUrl = process.env.PLAYWRIGHT_MARKETING_URL || 'https://nen1090-marketing.pages.dev';
const appUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://nen-1090-app.pages.dev';

async function assertNoRedirectLoop(page: import('@playwright/test').Page, url: string) {
  const responses: string[] = [];
  page.on('response', (response) => {
    if (response.url().startsWith(url)) {
      responses.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  expect(response, `Geen response ontvangen voor ${url}`).not.toBeNull();
  expect(response!.status(), `Onverwachte status voor ${url}: ${responses.join(' | ')}`).toBeLessThan(400);
}

test.describe('production smoke', () => {
  test('marketing loginpagina laadt en toont de hoofdactie', async ({ page }) => {
    await assertNoRedirectLoop(page, `${marketingUrl}/app/login.html`);
    await expect(page.getByRole('button', { name: /inloggen/i })).toBeVisible();
    await expect(page.getByText(/welkom terug/i)).toBeVisible();
  });

  test('pricing pagina opent zonder redirect loop', async ({ page }) => {
    await assertNoRedirectLoop(page, `${marketingUrl}/pricing`);
    await expect(page).toHaveURL(/\/pricing(?:\/)?$/);
    await expect(page.locator('body')).not.toContainText(/too many redirects|te vaak omgeleid/i);
  });

  test('app shell is bereikbaar', async ({ page }) => {
    const response = await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
    expect(response, 'App root gaf geen response').not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
    await expect(page.locator('body')).not.toContainText(/this site can.t be reached|deze pagina werkt momenteel niet/i);
  });
});
