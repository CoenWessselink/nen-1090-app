import { test, expect } from "@playwright/test";
import { bootstrapAuthenticatedPage } from "./helpers";

test.describe("fase 5 — smoke proof", () => {
  test("project 360 shell, topbar en KPI-interactie blijven bruikbaar", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "/projecten/e8e89d84-c24d-4334-a56c-61370665a7cf/overzicht");

    await expect(page.getByRole("button", { name: /terug naar projecten/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /nieuwe assembly/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /nieuwe las/i })).toBeVisible();

    await expect(page.getByTestId("project-kpi-welds")).toBeVisible();
    await page.getByTestId("project-kpi-welds").click();
    await expect(page).toHaveURL(/\/lassen$/i);
  });

  test("lassen en lascontrole tonen wijzig-popup met beide tabbladen", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "/projecten/e8e89d84-c24d-4334-a56c-61370665a7cf/lascontrole");

    await expect(page.getByText(/Dubbelklik opent.*Las wijzigen/i)).toBeVisible();
    const firstInteractiveRow = page.locator('div').filter({ hasText: /L-001|Las weld-001|Locatie onbekend/i }).first();
    await expect(firstInteractiveRow).toBeVisible();
    await firstInteractiveRow.dblclick();

    const dialog = page.getByRole("dialog", { name: /las wijzigen/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: /gegevens van de las/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /gegevens van de lascontrole/i })).toBeVisible();
  });

  test("ce dossier en rapportage zijn zichtbaar en niet leeg", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "/projecten/e8e89d84-c24d-4334-a56c-61370665a7cf/ce-dossier");

    await expect(page.getByText(/ontbrekende onderdelen|checklist|exporthistorie|score/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /pdf|zip|excel/i }).first()).toBeVisible();

    await page.goto("/rapportage");
    await expect(page.getByText(/rapportage|rapporten/i).first()).toBeVisible();
    await expect(page.getByText(/Weekrapport|projectoverzicht|gereed/i).first()).toBeVisible();
  });
});
