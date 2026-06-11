import { expect, test } from "@playwright/test";

test("student can navigate the core learning flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Northstar AMC")).toBeVisible();
  await expect(page.getByText("Today's mission")).toBeVisible();

  await page.getByRole("button", { name: "Knowledge" }).click();
  await expect(page.getByRole("heading", { name: "AMC 8 curriculum" })).toBeVisible();

  await page.getByRole("button", { name: "Mock tests" }).click();
  await expect(page.getByRole("heading", { name: "25 questions · 40 minutes" })).toBeVisible();
  await expect(page.getByText("Answer sheet")).toBeVisible();

  await page.getByRole("button", { name: "AI coach" }).click();
  await expect(page.getByRole("heading", { name: "Think first. Reveal less." })).toBeVisible();
});

test("family roles expose separate oversight views", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Viewing as").selectOption("parent");
  await expect(page.getByRole("heading", { name: "Matt & Chris" })).toBeVisible();

  await page.getByLabel("Viewing as").selectOption("admin");
  await expect(page.getByRole("heading", { name: "Content and experiment health" })).toBeVisible();
  await expect(page.getByText("Dataset acceptance")).toBeVisible();
});
