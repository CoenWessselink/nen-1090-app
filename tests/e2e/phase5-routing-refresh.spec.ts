import { test, expect } from "@playwright/test";
import { bootstrapAuthenticatedPage } from "./helpers";

test.describe("fase 5 — routing en refresh", () => {
  test("refresh op projectroute verliest projectcontext niet", async ({ page }) => {
    const target = "/projecten/e8e89d84-c24d-4334-a56c-61370665a7cf/documenten";
    await bootstrapAuthenticatedPage(page, target);
    await expect(page).toHaveURL(/\/projecten\/.+\/documenten/i);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/projecten\/.+\/documenten/i);
    await expect(page.getByRole("button", { name: /terug naar projecten/i })).toBeVisible();
  });

  test("oude of lege projectroute blijft binnen project-shell", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "/projecten/e8e89d84-c24d-4334-a56c-61370665a7cf");
    await expect(page).toHaveURL(/\/projecten\/.+/i);
    await expect(page.getByRole("button", { name: /nieuwe assembly/i })).toBeVisible();
  });
});
