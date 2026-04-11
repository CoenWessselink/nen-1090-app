import { test, expect } from '@playwright/test';
import { bootstrapAuthenticatedPage, DEFAULT_PROJECT_ID } from './helpers';

test('fase 1 auth-bootstrap opent lascontrole direct zonder echte login', async ({ page }) => {
  await bootstrapAuthenticatedPage(page, `/projecten/${DEFAULT_PROJECT_ID}/lascontrole`);

  await expect(page).toHaveURL(/\/lascontrole$/i);
  await expect(page.getByText(/Dubbelklik opent “Las wijzigen”/i)).toBeVisible();

  const weldCard = page.getByText(/L-001/).first();
  await expect(weldCard).toBeVisible();
  await weldCard.dblclick();

  await expect(page.getByRole('heading', { name: /Las wijzigen/i })).toBeVisible();
  await page.getByRole('button', { name: /Gegevens van de lascontrole/i }).click();
  await expect(page.getByText(/VISUAL_BASE/i)).toBeVisible();
});
