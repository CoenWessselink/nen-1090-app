import { test } from '@playwright/test';
import { DEFAULT_PROJECT_ID, expectAppShell, login, mobileViewport, saveRouteScreenshot } from './_ultra-helper';

const routes = [
  ['/dashboard', 'mobile-dashboard'],
  ['/projecten', 'mobile-projecten'],
  [`/projecten/${DEFAULT_PROJECT_ID}/overzicht`, 'mobile-project-overzicht'],
  [`/projecten/${DEFAULT_PROJECT_ID}/lassen`, 'mobile-project-lassen'],
  ['/instellingen', 'mobile-instellingen'],
] as const;

test.describe('phase 11 ultra - mobile screenshot baselines', () => {
  test.use({ viewport: mobileViewport });

  for (const [route, name] of routes) {
    test(`${name} renders after login`, async ({ page }) => {
      await login(page);
      await page.goto(route, { waitUntil: 'networkidle' });
      await expectAppShell(page);
      await saveRouteScreenshot(page, name);
    });
  }
});
