import { test, expect } from '@playwright/test';
import {
  attachErrorCapture,
  DEFAULT_PROJECT_ID,
  expectNotOnLogin,
  filterKnownLowValueNoise,
  login,
} from './_error-hunter-helper';

test.describe('phase 11 error hunter - uncaught promise catcher', () => {
  test('lassen flow has no uncaught ApiError or promise rejection noise', async ({ page }) => {
    const capture = attachErrorCapture(page);
    await login(page);
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/lassen`, { waitUntil: 'networkidle' });
    await expectNotOnLogin(page);

    const consoleIssues = filterKnownLowValueNoise(capture.consoleIssues).filter(
      (line) => /uncaught|promise|ApiError|client\.ts|useWelds/i.test(line),
    );
    const pageErrors = filterKnownLowValueNoise(capture.pageErrors).filter(
      (line) => /ApiError|client\.ts|useWelds|promise/i.test(line),
    );

    expect(consoleIssues, consoleIssues.join('\n')).toEqual([]);
    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });
});
