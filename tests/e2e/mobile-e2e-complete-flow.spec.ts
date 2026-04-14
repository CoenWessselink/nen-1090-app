import { test, expect } from '@playwright/test';

test('mobile shell renders and tab bar is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Dashboard|Projecten|Rapportage/i).first()).toBeVisible();
});
