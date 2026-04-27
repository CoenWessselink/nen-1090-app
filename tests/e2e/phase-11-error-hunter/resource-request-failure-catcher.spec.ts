import { test, expect } from '@playwright/test';
import { attachErrorCapture, expectAppShell, filterKnownLowValueNoise, login } from './_error-hunter-helper';

test.describe('phase 11 error hunter - resource and request failures', () => {
  test('projecten route has no failed resources or failed requests', async ({ page }) => {
    const capture = attachErrorCapture(page);
    await login(page);
    await page.goto('/projecten', { waitUntil: 'networkidle' });
    await expectAppShell(page);

    const requestFailures = filterKnownLowValueNoise(capture.requestFailures);
    const resourceFailures = filterKnownLowValueNoise(capture.resourceFailures);

    expect(requestFailures, requestFailures.join('\n')).toEqual([]);
    expect(resourceFailures, resourceFailures.join('\n')).toEqual([]);
  });
});
