import { expect, test } from '@playwright/test';
import { seedSession } from './helpers';

test.describe('mobile phase 3 hardening flow', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);

    await page.route('**/api/v1/dashboard/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ active_projects: 12, open_welds: 34, rejected_welds: 5, pending_dossiers: 7 }),
      });
    });

    await page.route('**/api/v1/projects?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: 'proj-1', name: 'Nieuwbouw Bedrijfshal', projectnummer: 'PROJ-2023-004', client_name: 'ABC Constructie BV', execution_class: 'EXC 2' },
          ],
        }),
      });
    });

    await page.route('**/api/v1/projects/proj-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'proj-1', name: 'Nieuwbouw Bedrijfshal', projectnummer: 'PROJ-2023-004', client_name: 'ABC Constructie BV', execution_class: 'EXC 2' }),
      });
    });

    await page.route('**/api/v1/projects/proj-1/welds**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [{ id: 'weld-1', weld_no: 'LAS-10234', location: 'Balk 1 - Kolom A', status: 'gerepareerd', inspection_date: '2025-04-12' }] }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await page.route('**/api/v1/welds/weld-1', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'weld-1', weld_no: 'LAS-10234', location: 'Balk 1 - Kolom A', process: '135', material: 'S355', welders: 'Jan' }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await page.route('**/api/v1/welds/weld-1/inspection', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'insp-1', remarks: 'Eerste controle', checks: [{ group_key: 'Positie 1', status: 'Niet conform' }, { group_key: 'Positie 2', status: 'Niet conform' }, { group_key: 'Visuele Inspectie', status: 'Niet conform' }] }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await page.route('**/api/v1/inspections?**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
    });

    await page.route('**/api/v1/projects/proj-1/exports/preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ score: 80, checklist: [{ label: 'Risicoanalyse', status: 'Compleet', ok: true }, { label: 'FPC Controle', status: 'Ontbreekt' }] }),
      });
    });

    await page.route('**/api/v1/projects/proj-1/ce-dossier', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ score: 80, checklist: [] }) });
    });

    await page.route('**/api/v1/projects/proj-1/documents**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [{ id: 'doc-1', filename: 'Constructietekening 001.pdf', mime_type: 'application/pdf', size_bytes: 435000, preview_url: 'https://example.com/doc-1.pdf' }] }),
      });
    });

    await page.route('**/api/v1/documents/doc-1**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'doc-1', filename: 'Constructietekening 001.pdf', mime_type: 'application/pdf', preview_url: 'https://example.com/doc-1.pdf' }),
      });
    });
  });

  test('mobile kernflow blijft stabiel van dashboard tot pdf viewer', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByTestId('mobile-dashboard-page')).toBeVisible();
    await page.getByTestId('mobile-kpi-actieve-projecten').click();

    await expect(page.getByTestId('mobile-projects-page')).toBeVisible();
    await page.getByTestId('mobile-project-card-proj-1').click();

    await expect(page.getByTestId('mobile-project360-page')).toBeVisible();
    await page.getByTestId('mobile-project360-action-lassen').click();

    await expect(page.getByTestId('mobile-welds-page')).toBeVisible();
    await page.getByTestId('mobile-weld-card-weld-1').getByRole('button', { name: 'Inspectie' }).click();

    await expect(page.getByTestId('mobile-inspection-page')).toBeVisible();
    await page.getByTestId('mobile-inspection-row-positie-1').getByRole('button', { name: 'Conform' }).click();
    await page.getByTestId('mobile-inspection-save-button').click();

    await expect(page.getByTestId('mobile-welds-page')).toBeVisible();
    await page.goto('/projecten/proj-1/ce-dossier');
    await expect(page.getByTestId('mobile-ce-page')).toBeVisible();
    await page.getByTestId('mobile-ce-open-pdf').click();

    await expect(page.getByTestId('mobile-pdf-page')).toBeVisible();
    await expect(page.getByTestId('mobile-pdf-viewer-card')).toBeVisible();
  });
});
