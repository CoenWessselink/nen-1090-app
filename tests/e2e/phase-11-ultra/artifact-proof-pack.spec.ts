import { test } from '@playwright/test';
import { DEFAULT_PROJECT_ID, collectApiFailures, collectConsoleIssues, expectAppShell, login, saveRouteScreenshot } from './_ultra-helper';

test.describe('phase 11 ultra - artifact proof pack', () => {
  test('dashboard and project shell emit screenshots with clean logs', async ({ page }) => {
    const consoleIssues = await collectConsoleIssues(page);
    const apiIssues = await collectApiFailures(page);

    await login(page);

    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expectAppShell(page);
    await saveRouteScreenshot(page, 'artifact-dashboard');

    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/overzicht`, { waitUntil: 'networkidle' });
    await expectAppShell(page);
    await saveRouteScreenshot(page, 'artifact-project-overzicht');

    // Save evidence without failing on known low-value noise patterns.
    const filteredConsole = consoleIssues.filter((x) => !/favicon|deprecated|manifest/i.test(x));
    if (filteredConsole.length) {
      throw new Error(`Console issues detected:\n${filteredConsole.join('\n')}`);
    }
    if (apiIssues.length) {
      throw new Error(`API issues detected:\n${apiIssues.join('\n')}`);
    }
  });
});
