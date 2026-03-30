import { expect, test } from '@playwright/test';

const liveEnabled = process.env.PLAYWRIGHT_LIVE_AUTH === '1';

test.describe('live project open flow', () => {
  test.skip(!liveEnabled, 'Live project E2E alleen draaien met PLAYWRIGHT_LIVE_AUTH=1.');

  test('@e2e-live @project360 opent eerste project en wisselt tabs', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Tenant').fill(process.env.PLAYWRIGHT_AUTH_TENANT || 'demo');
    await page.getByLabel('E-mail').fill(process.env.PLAYWRIGHT_AUTH_EMAIL || 'admin@demo.com');
    await page.getByLabel('Wachtwoord').fill(process.env.PLAYWRIGHT_AUTH_PASSWORD || 'Admin123!');
    await page.getByRole('button', { name: /inloggen/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/projecten');
    await expect(page.locator('body')).not.toContainText(/geen toegang|error|fout/i);

    const firstProjectLink = page.locator('a[href*="/projecten/"]').first();
    await expect(firstProjectLink).toBeVisible();
    await firstProjectLink.click();

    await expect(page).toHaveURL(/\/projecten\/.+/);

    const tabCandidates = [
      /assemblies/i,
      /lassen/i,
      /lascontrole/i,
      /documenten/i,
      /ce/i,
    ];

    for (const label of tabCandidates) {
      const tab = page.getByRole('link', { name: label }).or(page.getByRole('tab', { name: label })).first();
      if (await tab.count()) {
        await tab.click();
        await expect(page.locator('body')).not.toContainText(/500|unexpected|not found/i);
      }
    }
  });
});
