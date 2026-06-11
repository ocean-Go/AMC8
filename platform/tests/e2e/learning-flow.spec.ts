import { expect, test } from "@playwright/test";

test("student can navigate the core learning flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Northstar AMC")).toBeVisible();
  await expect(page.getByText("Today's mission")).toBeVisible();

  await page.getByRole("button", { name: "Knowledge" }).click();
  await expect(page.getByRole("heading", { name: "AMC 8 curriculum" })).toBeVisible();

  await page.getByRole("button", { name: "Mock tests" }).click();
  await expect(page.getByText("Answer sheet")).toBeVisible();

  await page.getByRole("button", { name: "AI solution paper" }).click();
  await expect(page.getByRole("heading", { name: "Write, replay, understand." })).toBeVisible();

  await page.getByRole("button", { name: "AI coach" }).click();
  await expect(page.getByRole("heading", { name: "Think first. Reveal less." })).toBeVisible();
  await expect(page.getByText("Local coaching only")).toBeVisible();
});

test("solution paper records handwriting and produces a saved review", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "AI solution paper" }).click();
  const canvas = page.getByLabel("Digital solution paper");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.move(box.x + 60, box.y + 90);
  await page.mouse.down();
  await page.mouse.move(box.x + 150, box.y + 130, { steps: 8 });
  await page.mouse.up();
  await page.mouse.move(box.x + 80, box.y + 180);
  await page.mouse.down();
  await page.mouse.move(box.x + 210, box.y + 180, { steps: 8 });
  await page.mouse.up();

  await expect(page.getByText("2 pen strokes")).toBeVisible();
  await page.getByRole("button", { name: "Finish & analyze" }).click();
  await expect(page.getByRole("heading", { name: "Process review" })).toBeVisible();
  await expect(page.getByText("1 saved")).toBeVisible();
});

test("solution paper stays inside a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "AI solution paper" }).click();

  const questionSelect = page.getByLabel("Practice problem");
  const canvas = page.getByLabel("Digital solution paper");
  await expect(questionSelect).toBeVisible();
  await expect(canvas).toBeVisible();

  const selectBox = await questionSelect.boundingBox();
  const canvasBox = await canvas.boundingBox();
  expect(selectBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();
  expect(selectBox!.x + selectBox!.width).toBeLessThanOrEqual(390);
  expect(canvasBox!.x + canvasBox!.width).toBeLessThanOrEqual(390);

  await page.screenshot({
    path: "test-results/solution-paper-mobile.png",
    fullPage: true,
  });
});

test("family roles expose separate oversight views", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Viewing as").selectOption("parent");
  await expect(page.getByRole("heading", { name: "Matt & Chris" })).toBeVisible();

  await page.getByLabel("Viewing as").selectOption("admin");
  await expect(page.getByRole("heading", { name: "Content and experiment health" })).toBeVisible();
  await expect(page.getByText("Dataset acceptance")).toBeVisible();
});
