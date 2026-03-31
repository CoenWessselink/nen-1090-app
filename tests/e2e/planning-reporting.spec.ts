import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('legacy planning route redirects away and rapportage shows backend results without fallback text', async ({ page }) => {
  await seedSession(page);
  await stubCommonApi(page);

  await page.route('**/api/v1/reports**', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [{ id: 'r1', title: 'Weekrapport 12', name: 'Weekrapport 12', type: 'Weekrapport', status: 'Gereed', owner: 'Kwaliteit', created_at: '2026-03-17T11:00:00Z' }],
      total: 1,
      page: 1,
      limit: 25,
    }),
  }));

  await page.goto('/planning');
  await expect(page).not.toHaveURL(/\/planning$/i);

  await page.goto('/rapportage');
  await expect(page.getByRole('heading', { name: /rapportage/i })).toBeVisible();
  await expect(page.getByText('Weekrapport 12')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/fallback|backend contract|server-side paging/i);
});
