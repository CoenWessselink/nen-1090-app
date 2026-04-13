import { test, expect } from '@playwright/test';
import {
  attachErrorCapture,
  DEFAULT_PROJECT_ID,
  expectNotOnLogin,
  filterCriticalApiFailures,
  login,
} from './_error-hunter-helper';

const routes = [
  '/dashboard',
  '/projecten',
  '/instellingen',
  `/projecten/${DEFAULT_PROJECT_ID}/overzicht`,
  `/projecten/${DEFAULT_PROJECT_ID}/lassen`,
  `/projecten/${DEFAULT_PROJECT_ID}/documenten`,
  `/projecten/${DEFAULT_PROJECT_ID}/ce-dossier`,
];

test.describe('phase 11 error hunter - critical api status catcher', () => {
  for (const route of routes) {
    test(`no critical 404/422/500-class api failures on ${route}`, async ({ page }) => {
      const capture = attachErrorCapture(page);
      await login(page);
      await page.goto(route, { waitUntil: 'networkidle' });
      await expectNotOnLogin(page);

      const failures = filterCriticalApiFailures(capture.responseFailures);
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }
});
