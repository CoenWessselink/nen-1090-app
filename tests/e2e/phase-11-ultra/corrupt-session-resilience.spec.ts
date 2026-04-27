import { test, expect } from '@playwright/test';
import { corruptLocalSession, login } from './_ultra-helper';

test.describe('phase 11 ultra - corrupt session resilience', () => {
  test('corrupt local session does not white-screen the app', async ({ page }) => {
    await login(page);
    await corruptLocalSession(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    await expect(page.locator('body')).toBeVisible();
    const body = await page.locator('body').textContent();
    expect(Boolean(body && body.trim().length > 0)).toBeTruthy();
  });
});
