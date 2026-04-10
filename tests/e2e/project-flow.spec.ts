import { test, expect } from '@playwright/test';
import { openFirstProject360 } from './helpers';

test('project overview opent via project-centrische flow', async ({ page }) => {
  await openFirstProject360(page);
  await expect(page.getByRole('button', { name: /nieuwe assembly/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /nieuwe las/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /ce dossier/i }).first()).toBeVisible();
});