import { test, expect } from "@playwright/test";
test("a friend starts the game from the website", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "play live", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
});
