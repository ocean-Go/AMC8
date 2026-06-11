import { expect, test } from "@playwright/test";

test("student can navigate the core learning flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Northstar AMC")).toBeVisible();
  await expect(page.getByText("Matt's 2027 AMC 8 mission")).toBeVisible();
  await expect(page.getByText("Gap to 20")).toBeVisible();
  await page.screenshot({
    path: "test-results/matt-dashboard-desktop.png",
    fullPage: true,
  });

  await page.getByRole("button", { name: "Knowledge" }).click();
  await expect(page.getByRole("heading", { name: "AMC 8 curriculum" })).toBeVisible();

  await page.getByRole("button", { name: "Toolbox" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Recognize the tool before doing the arithmetic.",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Mock tests" }).click();
  await expect(page.getByText("Answer sheet")).toBeVisible();

  await page.getByRole("button", { name: "AI solution paper" }).click();
  await expect(page.getByRole("heading", { name: "Write, replay, understand." })).toBeVisible();

  await page.getByRole("button", { name: "AI coach" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Think first. Reveal one level at a time.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start hint ladder" }).click();
  await expect(page.getByText("Hint 1: Understand")).toBeVisible();
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

test("Matt parent and admin views expose separate oversight", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Workspace").locator("option")).toHaveCount(3);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("matt-amc8-backup");

  await page.getByLabel("Workspace").selectOption("parent");
  await expect(
    page.getByRole("heading", { name: "Is Matt on track for 20?" }),
  ).toBeVisible();

  await page.getByLabel("Workspace").selectOption("admin");
  await expect(
    page.getByRole("heading", { name: "Content and system health" }),
  ).toBeVisible();
  await expect(page.getByText("Dataset acceptance")).toBeVisible();
});
