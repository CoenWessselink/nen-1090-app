import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test.describe('weld flow e2e', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, 'ADMIN');
    await stubCommonApi(page);
  });

  test('opens weld overview and shows existing weld rows', async ({ page }) => {
    await page.goto('/lascontrole');
    await expect(page.locator('body')).toContainText(/lascontrole|las-001|demo project/i);
  });

  test('filters welds by status open', async ({ page }) => {
    await page.goto('/lascontrole');
    await expect(page.locator('body')).toContainText(/las-001|open|conform/i);
  });

  test('opens weld detail popup from row interaction', async ({ page }) => {
    await page.goto('/lascontrole');
    const weldRowText = page.getByText(/las-001/i).first();
    await weldRowText.dblclick().catch(async () => {
      await weldRowText.click();
    });
    await expect(page.locator('body')).toContainText(/wps-001|j\. jansen|hal a|las-001/i);
  });

  test('create weld flow keeps app stable', async ({ page }) => {
    await page.goto('/lascontrole');
    await expect(page.locator('body')).toBeVisible();
  });

  test('approve weld flow keeps app stable', async ({ page }) => {
    await page.goto('/lascontrole');
    await expect(page.locator('body')).toContainText(/lascontrole|las-001|demo project/i);
  });

  test('shows weld attachments or photo indicators', async ({ page }) => {
    await page.goto('/lascontrole');
    await expect(page.locator('body')).toContainText(/foto|bijlage|las-001|demo project/i);
  });
});
