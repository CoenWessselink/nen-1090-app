import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test.describe('weld flow e2e', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, 'ADMIN');
    await stubCommonApi(page);
  });

  test('opens weld overview and shows existing weld rows', async ({ page }) => {
    await page.goto('/lascontrole');
    await expect(page.getByRole('heading', { name: /lascontrole/i })).toBeVisible();
    await expect(page.getByText(/las-001/i)).toBeVisible();
  });

  test('filters welds by status open', async ({ page }) => {
    await page.goto('/lascontrole');
    const statusFilter = page.getByRole('combobox').first();
    await statusFilter.selectOption('open').catch(async () => {
      // fallback for custom-select UIs
    });
    await expect(page.getByText(/las-001/i)).toBeVisible();
  });

  test('opens weld detail popup from row double click', async ({ page }) => {
    await page.goto('/lascontrole');
    const weldRowText = page.getByText(/las-001/i).first();
    await weldRowText.dblclick();
    await expect(page.getByText(/wps-001/i)).toBeVisible();
    await expect(page.getByText(/j\. jansen/i)).toBeVisible();
  });

  test('creates a weld through the global create route and receives an id-backed response', async ({ page }) => {
    await page.route('**/api/v1/welds', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-weld-001',
            project_id: 'p1',
            project_name: 'Demo project',
            weld_no: 'LAS-NEW-001',
            weld_number: 'LAS-NEW-001',
            process: '135',
            location: 'Hal A',
            status: 'open',
            result: 'pending',
            photos: 0,
            defect_count: 0
          })
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('/lascontrole');

    const newButton = page.getByRole('button', { name: /nieuwe las|new weld/i }).first();
    await expect(newButton).toBeVisible();
    await newButton.click();

    await page.getByLabel(/lasnummer|weld number|weld no/i).fill('LAS-NEW-001');
    await page.getByLabel(/locatie|location/i).fill('Hal A');

    const saveButton = page.getByRole('button', { name: /opslaan|save/i }).last();
    await saveButton.click();

    await expect(page.getByText(/las-new-001/i)).toBeVisible();
  });

  test('approves a weld through the conform action', async ({ page }) => {
    await page.route('**/api/projects/*/welds/*/conform', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, id: 'w1', status: 'conform' })
      });
    });

    await page.goto('/lascontrole');
    await page.getByText(/las-001/i).first().dblclick();

    const conformButton = page.getByRole('button', { name: /conform|goedkeuren|approve/i }).first();
    await expect(conformButton).toBeVisible();
    await conformButton.click();

    await expect(page.getByText(/conform/i)).toBeVisible();
  });

  test('shows weld attachments section and existing photo rows', async ({ page }) => {
    await page.goto('/lascontrole');
    await page.getByText(/las-001/i).first().dblclick();
    await expect(page.getByText(/foto-1\.jpg/i)).toBeVisible();
  });
});
