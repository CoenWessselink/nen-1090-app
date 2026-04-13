import { test, expect } from '@playwright/test';
import { attachErrorCapture, expectAppShell, filterKnownLowValueNoise, login } from './_error-hunter-helper';

test.describe('phase 11 error hunter - console and pageerror catcher', () => {
  test('dashboard emits no critical console or page errors', async ({ page }) => {
    const capture = attachErrorCapture(page);
    await login(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expectAppShell(page);

    const consoleIssues = filterKnownLowValueNoise(capture.consoleIssues);
    const pageErrors = filterKnownLowValueNoise(capture.pageErrors);

    expect(consoleIssues, consoleIssues.join('\n')).toEqual([]);
    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });
});
