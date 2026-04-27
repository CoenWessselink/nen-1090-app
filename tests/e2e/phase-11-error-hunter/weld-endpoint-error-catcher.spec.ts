import { test, expect } from '@playwright/test';
import {
  attachErrorCapture,
  DEFAULT_PROJECT_ID,
  expectNotOnLogin,
  filterKnownLowValueNoise,
  filterWeldFlowFailures,
  login,
  openPotentialWeldDetail,
  saveEvidence,
} from './_error-hunter-helper';

test.describe('phase 11 error hunter - weld endpoint catcher', () => {
  test('lassen route and weld detail emit no 404/422/500 weld-flow failures', async ({ page }) => {
    const capture = attachErrorCapture(page);
    await login(page);
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/lassen`, { waitUntil: 'networkidle' });
    await expectNotOnLogin(page);

    await openPotentialWeldDetail(page);
    await saveEvidence(page, 'weld-flow-evidence');

    const weldFailures = filterWeldFlowFailures(capture.responseFailures);
    const consoleIssues = filterKnownLowValueNoise(capture.consoleIssues).filter(
      (line) => /ApiError|useWelds|client\.ts/i.test(line),
    );

    expect(weldFailures, weldFailures.join('\n')).toEqual([]);
    expect(consoleIssues, consoleIssues.join('\n')).toEqual([]);
  });
});
