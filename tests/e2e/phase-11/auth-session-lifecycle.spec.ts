import { test, expect } from "@playwright/test";

test.setTimeout(15000);

test("auth lifecycle stable", async ({ page }) => {
  await page.goto("/login");

  await page.fill('input[type="email"]', "admin@demo.com");
  await page.fill('input[type="password"]', "Admin123!");
  await page.click('button[type="submit"]');

  await Promise.race([
    page.waitForSelector('[data-app-ready="1"]', { timeout: 10000 }),
    page.waitForURL('**/dashboard', { timeout: 10000 })
  ]);

  await expect(page).not.toHaveURL(/login/);
});