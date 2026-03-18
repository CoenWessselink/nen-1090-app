import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('command palette gebruikt globale zoekresultaten en ce exportknoppen blijven werkend', async ({ page }) => {
  await seedSession(page, 'SUPERADMIN');
  await stubCommonApi(page);

  await page.route('**/api/v1/projects/p1/compliance', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ score: 84 }),
  }));
  await page.route('**/api/v1/projects/p1/compliance/checklist', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ checklist: [{ label: 'WPS aanwezig', completed: true }] }),
  }));
  await page.route('**/api/v1/projects/p1/compliance/missing-items', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ missing_items: [{ label: 'WPQR ontbreekt', reason: 'Nog niet geüpload' }] }),
  }));
  await page.route('**/api/v1/projects/p1/documents**', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [{ id: 'd1', title: 'WPS-001.pdf', status: 'actief', uploaded_at: '2026-03-17T09:00:00Z' }], total: 1 }),
  }));
  await page.route('**/api/v1/projects/p1/exports**', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [{ id: 'e1', type: 'ce-report', status: 'completed', created_at: '2026-03-17T10:00:00Z' }], total: 1 }),
      });
    }
    return route.fallback();
  });
  await page.route('**/api/v1/projects/p1/exports/*', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true }),
  }));

  await page.goto('/dashboard');
  await page.getByRole('button', { name: /command/i }).click();
  await page.locator('.command-search input').fill('demo');
  await expect(page.getByText('Demo project')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto('/ce-dossier');
  await page.getByPlaceholder('Project ID').fill('p1');
  await expect(page.getByText('WPS aanwezig')).toBeVisible();
  await page.getByRole('button', { name: /ce rapport/i }).click();
  await expect(page.getByText(/ce rapport export gestart/i)).toBeVisible();
  await expect(page.getByText(/ce-report/i)).toBeVisible();
});
