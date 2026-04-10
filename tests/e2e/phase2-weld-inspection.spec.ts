import { test, expect } from '@playwright/test';
import { DEFAULT_PROJECT_ID, bootstrapAuthenticatedPage } from './helpers';

test('fase 2 — las wijzigen en inspectie-tab zichtbaar', async ({ page }) => {
  await bootstrapAuthenticatedPage(page, `/projecten/${DEFAULT_PROJECT_ID}/lascontrole`);

  await expect(page.getByText('Dubbelklik opent “Las wijzigen”')).toBeVisible();
  await page.getByRole('button', { name: /^Wijzigen$/i }).first().click();
  await expect(page.getByRole('heading', { name: /las wijzigen/i })).toBeVisible();

  await page.getByRole('button', { name: /gegevens van de las/i }).click();
  await expect(page.getByText('Executieklasse')).toBeVisible();

  await page.getByRole('button', { name: /gegevens van de lascontrole/i }).click();
  await expect(page.getByText(/VISUAL_BASE|controle/i).first()).toBeVisible();
});
