import { describe, expect, it } from "vitest";
import type { SolutionStroke } from "@/lib/domain";
import {
  calculateSolutionMetrics,
  createLocalSolutionAnalysis,
} from "@/lib/solution-paper";

function stroke(
  startedAt: number,
  endedAt: number,
  tool: SolutionStroke["tool"] = "pen",
): SolutionStroke {
  return {
    id: String(startedAt),
    tool,
    color: "#111111",
    width: 3,
    startedAt,
    endedAt,
    points: [{ x: 0.1, y: 0.1, t: startedAt }],
  };
}

describe("solution paper metrics", () => {
  it("counts writing, erasing, undo, and meaningful pauses", () => {
    const metrics = calculateSolutionMetrics(
      [stroke(0, 1000), stroke(7000, 8000), stroke(9000, 9500, "eraser")],
      12,
      2,
    );

    expect(metrics.strokeCount).toBe(2);
    expect(metrics.eraserStrokeCount).toBe(1);
    expect(metrics.undoCount).toBe(2);
    expect(metrics.pauseCount).toBe(1);
    expect(metrics.longestPauseSeconds).toBe(6);
  });

  it("creates an explicit non-vision fallback report", () => {
    const report = createLocalSolutionAnalysis(
      calculateSolutionMetrics([stroke(0, 500)], 200, 0),
    );

    expect(report.source).toBe("local");
    expect(report.summary).toContain("not interpreted");
    expect(report.suggestions.length).toBeGreaterThan(0);
  });
});
