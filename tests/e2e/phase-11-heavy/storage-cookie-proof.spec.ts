import { test, expect } from '@playwright/test';
import { assertStoragePresent, login, snapshotSession } from './_heavy-helper';

test.describe('phase 11 heavy - storage and cookie proof', () => {
  test('login leaves persistent session evidence before and after refresh', async ({ page }) => {
    await login(page);
    await assertStoragePresent(page);

    const before = await snapshotSession(page);
    await page.reload({ waitUntil: 'networkidle' });
    const after = await snapshotSession(page);

    expect(Boolean(before.local || before.session || before.cookies)).toBeTruthy();
    expect(Boolean(after.local || after.session || after.cookies)).toBeTruthy();
  });
});
