
const { test, expect } = require('@playwright/test');

test('project page contains ce dossier section or export action', async ({ page }) => {
  await page.goto('/layers/projecten.html');
  await expect(page.locator('body')).toContainText(/CE dossier|Export/i);
});
