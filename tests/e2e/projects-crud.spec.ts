import { expect, test } from '@playwright/test';
import { openFirstProject360 } from './helpers';

test('projecten ondersteunt operationele projectflow via de nieuwe projectentabel', async ({ page }) => {
  await openFirstProject360(page);
  await expect(page.locator('main')).toContainText(/project|assembly|las|document/i);
  await expect(page.getByRole('button', { name: /nieuwe assembly/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /nieuwe las/i })).toBeVisible();
});
