import { test, expect } from '@playwright/test';
import { openFirstProject360, openTab } from './helpers';

test('project flow opent project 360 en alle hoofdtabs', async ({ page }) => {
  await openFirstProject360(page);

  await expect(page.getByRole('heading', { name: /demo project|jk test|project/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /nieuwe assembly/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /nieuwe las/i })).toBeVisible();

  for (const tab of [/overzicht/i, /assemblies/i, /lassen/i, /lascontrole/i, /documenten/i, /ce dossier/i, /historie/i]) {
    await openTab(page, tab);
  }
});
