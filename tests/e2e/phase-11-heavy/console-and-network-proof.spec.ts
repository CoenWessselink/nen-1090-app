import { test, expect } from '@playwright/test';
import { collectApiFailures, collectConsoleIssues, login, expectAppShell, DEFAULT_PROJECT_ID } from './_heavy-helper';

test.describe('phase 11 heavy - console and network proof', () => {
  test('dashboard opens without unexpected console noise', async ({ page }) => {
    const consoleIssues = await collectConsoleIssues(page);
    const apiIssues = await collectApiFailures(page);
    await login(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expectAppShell(page);

    const filteredConsole = consoleIssues.filter((x) => !/favicon|deprecated|manifest/i.test(x));
    expect(filteredConsole, filteredConsole.join('\n')).toEqual([]);
    expect(apiIssues, apiIssues.join('\n')).toEqual([]);
  });

  test('project shell opens without unexpected console or api failures', async ({ page }) => {
    const consoleIssues = await collectConsoleIssues(page);
    const apiIssues = await collectApiFailures(page);
    await login(page);
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/overzicht`, { waitUntil: 'networkidle' });
    await expectAppShell(page);

    const filteredConsole = consoleIssues.filter((x) => !/favicon|deprecated|manifest/i.test(x));
    expect(filteredConsole, filteredConsole.join('\n')).toEqual([]);
    expect(apiIssues, apiIssues.join('\n')).toEqual([]);
  });
});
