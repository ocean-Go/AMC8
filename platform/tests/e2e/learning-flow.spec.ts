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
  await expect(
    page.getByRole("heading", {
      name: "Replay the work. Understand the thinking.",
    }),
  ).toBeVisible();

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
  await page.getByRole("button", { name: "Start solving" }).click();
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
  await page.getByRole("button", { name: "Undo" }).click();
  await page.getByRole("button", { name: "Redo" }).click();
  await page.getByRole("button", { name: "A 10" }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(
    page.getByText("Incorrect. Review your work and try again."),
  ).toBeVisible();
  await page.getByRole("button", { name: "C 20" }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Correct", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finish & save replay" }).click();
  await expect(page.getByText("Thinking replay", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Process summary" })).toBeVisible();
  await expect(page.getByText("Local analytics", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Restart replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo at" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Answer C - Correct at" }),
  ).toBeVisible();
  await expect(page.getByText("Thinking phases")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Thinking timeline" })).toBeVisible();
  await expect(page.getByText("Matt selected C: Correct")).toBeVisible();
  await page.getByRole("button", { name: "4x" }).click();
  await page.getByRole("button", { name: "Play replay" }).click();
  await expect(page.getByRole("button", { name: "Pause replay" })).toBeVisible();
  await page.getByRole("button", { name: "Pause replay" }).click();
  await expect(page.getByText("1 saved")).toBeVisible();
  await page.getByRole("button", { name: "Analyze with AI Vision" }).click();
  await expect(
    page.getByText(
      "AI Vision was unavailable. The local process summary remains valid.",
    ),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/thinking-replay-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const replayCanvas = page.getByLabel("Thinking replay canvas");
  const replayBox = await replayCanvas.boundingBox();
  expect(replayBox).not.toBeNull();
  expect(replayBox!.x + replayBox!.width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/thinking-replay-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Ask AI Coach" }).click();
  await expect(page.getByText(/Thinking Replay:/)).toBeVisible();
});

test("solution paper stays inside a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "AI solution paper" }).click();
  await page.getByRole("button", { name: "Start solving" }).click();

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

  await page.getByRole("button", { name: "Enter focus mode" }).click();
  const focusCanvasBox = await canvas.boundingBox();
  expect(focusCanvasBox).not.toBeNull();
  expect(focusCanvasBox!.x + focusCanvasBox!.width).toBeLessThanOrEqual(390);
  expect(focusCanvasBox!.y + focusCanvasBox!.height).toBeLessThanOrEqual(844);
  await page.getByRole("button", { name: "Exit focus mode" }).click();

  await page.screenshot({
    path: "test-results/solution-paper-mobile.png",
    fullPage: true,
  });
});

test("solution paper supports a tablet handwriting workflow", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/");
  await page.getByRole("button", { name: "AI solution paper" }).click();
  await page.getByRole("button", { name: "Start solving" }).click();
  await page.getByRole("button", { name: "Pen size 5" }).click();
  await expect(page.getByRole("button", { name: "Pen size 5" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Enter focus mode" }).click();

  const canvas = page.getByLabel("Digital solution paper");
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox!.x + canvasBox!.width).toBeLessThanOrEqual(820);
  expect(canvasBox!.y + canvasBox!.height).toBeLessThanOrEqual(1180);
  await expect(page.getByLabel("Quick answer check")).toBeVisible();
  await page.getByRole("button", { name: "Select answer C" }).click();
  await page.getByRole("button", { name: "Check quick answer" }).click();
  await page.getByRole("button", { name: "Exit focus mode" }).click();
});

test("legacy solution papers load with generated replay analytics", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "amc8-learning-state-v1",
      JSON.stringify({
        students: {
          matt: {
            solutionPapers: [
              {
                id: "legacy-paper",
                studentId: "matt",
                questionId: "ratio-01",
                questionPrompt: "Legacy solution paper",
                createdAt: "2026-06-11T12:00:00.000Z",
                metrics: {
                  durationSeconds: 60,
                  activeSeconds: 1,
                  strokeCount: 1,
                  eraserStrokeCount: 0,
                  undoCount: 0,
                  pauseCount: 0,
                  longestPauseSeconds: 0,
                },
                strokes: [
                  {
                    id: "legacy-stroke",
                    tool: "pen",
                    color: "#17372f",
                    width: 3,
                    startedAt: 50_000,
                    endedAt: 51_000,
                    points: [
                      { x: 0.1, y: 0.1, t: 50_000 },
                      { x: 0.2, y: 0.2, t: 51_000 },
                    ],
                  },
                ],
                analysis: {
                  source: "local",
                  summary: "Legacy local report.",
                  approach: [],
                  strengths: [],
                  unclearPoints: [],
                  errors: [],
                  suggestions: [],
                  notableIdea: null,
                },
              },
            ],
          },
        },
      }),
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "AI solution paper" }).click();

  await expect(page.getByText("Legacy solution paper").first()).toBeVisible();
  await expect(page.getByText("long stuck", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Very long pause at 00:50" })).toBeVisible();
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
