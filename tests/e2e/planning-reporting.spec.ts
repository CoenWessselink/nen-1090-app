import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('planning en rapportage tonen backendresultaten zonder fallback-data', async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);

  await page.route('**/api/planning**', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [{ id: 'pl1', title: 'Montage hal A', project_name: 'Demo project', assignee: 'P. Planner', start_date: '2026-03-18', end_date: '2026-03-20', status: 'Gepland' }],
      total: 1,
    }),
  }));

  await page.route('**/api/reports**', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [{ id: 'r1', title: 'Weekrapport 12', type: 'Weekrapport', status: 'Gereed', owner: 'Kwaliteit', created_at: '2026-03-17T11:00:00Z' }],
      total: 1,
    }),
  }));

  await page.goto('/planning');
  await expect(page.getByRole('heading', { name: 'Planning' })).toBeVisible();
  await expect(page.getByText('Montage hal A')).toBeVisible();
  await page.getByPlaceholder(/zoek op taak, project of medewerker/i).fill('Planner');
  await expect(page.getByText('Montage hal A')).toBeVisible();

  await page.goto('/rapportage');
  await expect(page.getByRole('heading', { name: 'Rapportage' })).toBeVisible();
  await expect(page.getByText('Weekrapport 12')).toBeVisible();
  await page.getByPlaceholder(/zoek rapportages/i).fill('Weekrapport');
  await expect(page.getByRole('button', { name: /exporteer csv/i })).toBeEnabled();
});
