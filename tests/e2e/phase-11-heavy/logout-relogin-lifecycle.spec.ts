import { test, expect } from '@playwright/test';
import { expectNotOnLogin, login } from './_heavy-helper';

test.describe('phase 11 heavy - logout relogin lifecycle', () => {
  test('logout route clears access and relogin restores shell', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expectNotOnLogin(page);

    await page.goto('/logout', { waitUntil: 'networkidle' });
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/login(?:$|[?#])/);

    await login(page);
    await page.goto('/projecten', { waitUntil: 'networkidle' });
    await expectNotOnLogin(page);
  });
});
