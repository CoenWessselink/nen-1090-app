import { test, expect } from '@playwright/test';
import { login, desktopViewport, mobileViewport } from './_ultra-helper';

test.describe('phase 11 ultra - desktop/mobile parity', () => {
  test('desktop shell remains usable after login', async ({ browser }) => {
    const context = await browser.newContext({ viewport: desktopViewport });
    const page = await context.newPage();
    await login(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(/dashboard|projecten|rapportage|instellingen/i);
    await context.close();
  });

  test('mobile shell remains usable after login', async ({ browser }) => {
    const context = await browser.newContext({ viewport: mobileViewport, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await login(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(/dashboard|projecten|rapportage|instellingen/i);
    await context.close();
  });
});
