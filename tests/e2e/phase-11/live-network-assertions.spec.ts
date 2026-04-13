import { test, expect } from '@playwright/test';
import { DEFAULT_PROJECT_ID, collectApiFailures, login, expectStillAuthenticated } from './_auth-proof-helper';

test.describe('phase 11 expansion - live network assertions', () => {
  test('dashboard load after login has no unexpected api failures', async ({ page }) => {
    const issues = await collectApiFailures(page);
    await login(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    await expectStillAuthenticated(page);
    expect(issues, issues.join('\n')).toEqual([]);
  });

  test('project shell load after login has no unexpected api failures', async ({ page }) => {
    const issues = await collectApiFailures(page);
    await login(page);
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/overzicht`, { waitUntil: 'networkidle' });

    await expectStillAuthenticated(page);
    expect(issues, issues.join('\n')).toEqual([]);
  });

  test('ce dossier load after login has no unexpected api failures', async ({ page }) => {
    const issues = await collectApiFailures(page);
    await login(page);
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/ce-dossier`, { waitUntil: 'networkidle' });

    await expectStillAuthenticated(page);
    expect(issues, issues.join('\n')).toEqual([]);
  });
});
