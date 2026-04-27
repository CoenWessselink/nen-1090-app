import { test, expect } from '@playwright/test';
import {
  attachErrorCapture,
  DEFAULT_PROJECT_ID,
  expectNotOnLogin,
  filterCriticalApiFailures,
  filterKnownLowValueNoise,
  login,
} from './_error-hunter-helper';

const matrix = [
  { route: '/dashboard', label: 'dashboard' },
  { route: '/projecten', label: 'projecten' },
  { route: '/instellingen', label: 'instellingen' },
  { route: `/projecten/${DEFAULT_PROJECT_ID}/overzicht`, label: 'project-overzicht' },
  { route: `/projecten/${DEFAULT_PROJECT_ID}/assemblies`, label: 'project-assemblies' },
  { route: `/projecten/${DEFAULT_PROJECT_ID}/lassen`, label: 'project-lassen' },
  { route: `/projecten/${DEFAULT_PROJECT_ID}/documenten`, label: 'project-documenten' },
  { route: `/projecten/${DEFAULT_PROJECT_ID}/ce-dossier`, label: 'project-ce-dossier' },
  { route: `/projecten/${DEFAULT_PROJECT_ID}/historie`, label: 'project-historie' },
];

test.describe('phase 11 error hunter - route matrix', () => {
  for (const item of matrix) {
    test(`${item.label} has no critical console/page/api/request failures`, async ({ page }) => {
      const capture = attachErrorCapture(page);
      await login(page);
      await page.goto(item.route, { waitUntil: 'networkidle' });
      await expectNotOnLogin(page);

      const apiFailures = filterCriticalApiFailures(capture.responseFailures);
      const requestFailures = filterKnownLowValueNoise(capture.requestFailures);
      const consoleIssues = filterKnownLowValueNoise(capture.consoleIssues);
      const pageErrors = filterKnownLowValueNoise(capture.pageErrors);

      expect(apiFailures, apiFailures.join('\n')).toEqual([]);
      expect(requestFailures, requestFailures.join('\n')).toEqual([]);
      expect(consoleIssues, consoleIssues.join('\n')).toEqual([]);
      expect(pageErrors, pageErrors.join('\n')).toEqual([]);
    });
  }
});
