import { test } from '@playwright/test';
import { DEFAULT_PROJECT_ID, expectAppShell, login, saveRouteScreenshot } from './_ultra-helper';

const routes = [
  ['/dashboard', 'desktop-dashboard'],
  ['/projecten', 'desktop-projecten'],
  [`/projecten/${DEFAULT_PROJECT_ID}/overzicht`, 'desktop-project-overzicht'],
  [`/projecten/${DEFAULT_PROJECT_ID}/lassen`, 'desktop-project-lassen'],
  [`/projecten/${DEFAULT_PROJECT_ID}/ce-dossier`, 'desktop-project-ce-dossier'],
  ['/instellingen', 'desktop-instellingen'],
] as const;

test.describe('phase 11 ultra - desktop screenshot baselines', () => {
  for (const [route, name] of routes) {
    test(`${name} renders after login`, async ({ page }) => {
      await login(page);
      await page.goto(route, { waitUntil: 'networkidle' });
      await expectAppShell(page);
      await saveRouteScreenshot(page, name);
    });
  }
});
