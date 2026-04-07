import { test, expect } from '@playwright/test';

const DEMO = {
  tenant: 'demo',
  email: 'admin@demo.com',
  password: 'Admin123!',
};

test('fase 2 — las wijzigen en inspectie-tab zichtbaar', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/tenant/i).fill(DEMO.tenant);
  await page.getByLabel(/e-mailadres/i).fill(DEMO.email);
  await page.getByLabel(/wachtwoord/i).fill(DEMO.password);
  await page.getByRole('button', { name: /inloggen/i }).click();

  await expect(page).toHaveURL(/dashboard|projecten/);
  await page.goto('/projecten');
  await page.getByTestId('projects-table-row').first().dblclick();
  await expect(page).toHaveURL(/\/projecten\/.+\/overzicht/);

  await page.goto(page.url().replace('/overzicht', '/lascontrole'));
  await expect(page.getByText('Dubbelklik opent “Las wijzigen”')).toBeVisible();
  await page.locator('.list-row-button').first().dblclick();
  await expect(page.getByRole('dialog', { name: /las wijzigen/i })).toBeVisible();
  await page.getByRole('tab', { name: /gegevens van de las/i }).click();
  await expect(page.getByLabel(/executieklasse/i)).toBeVisible();
  await page.getByRole('tab', { name: /gegevens van de lascontrole/i }).click();
  await expect(page.getByText(/VISUAL_BASE|controle/i).first()).toBeVisible();
});
