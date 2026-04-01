import { test, expect } from '@playwright/test';
import { openFirstProject360, openTab } from './helpers';

async function expectStructuredProjectTab(page: import('@playwright/test').Page) {
  await expect(page.locator('[data-project-structure="tabs"]')).toBeVisible();
  await expect(page.locator('[data-project-structure="actions"]')).toBeVisible();
  await expect(page.locator('[data-project-structure="filters"]')).toBeVisible();
  await expect(page.locator('[data-project-structure="kpis"]')).toBeVisible();
  await expect(page.locator('[data-project-structure="content"]')).toBeVisible();
}

test('projecttab structuur blijft overal gelijk', async ({ page }) => {
  await openFirstProject360(page);
  await expectStructuredProjectTab(page);

  await openTab(page, /lascontrole/i);
  await expectStructuredProjectTab(page);

  await openTab(page, /ce dossier/i);
  await expectStructuredProjectTab(page);
});
