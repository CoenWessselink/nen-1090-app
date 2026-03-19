import { expect, test } from '@playwright/test';

const apiUrl = process.env.PLAYWRIGHT_API_URL || 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';
const appUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://nen-1090-app.pages.dev';

test.describe('API and proxy smoke', () => {
  test('live API health endpoint antwoordt 200', async ({ request }) => {
    const response = await request.get(`${apiUrl}/health`);
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
  });

  test('app proxy health endpoint antwoordt zonder 5xx', async ({ request }) => {
    const response = await request.get(`${appUrl}/api/v1/health`, {
      failOnStatusCode: false,
    });
    expect(response.status(), `Proxy health gaf status ${response.status()}`).toBeLessThan(500);
  });
});
