import { describe, expect, it } from "vitest";
import type { PaperAction, SolutionStroke } from "@/lib/domain";
import {
  calculateRevisionMetrics,
  calculateSolutionMetrics,
  createLocalSolutionAnalysis,
  createReplayMarkers,
  createThinkingReplaySummary,
  normalizeSolutionPaperRecord,
  visibleStrokesAt,
} from "@/lib/solution-paper";

function stroke(
  id: string,
  startedAt: number,
  endedAt: number,
  tool: SolutionStroke["tool"] = "pen",
): SolutionStroke {
  return {
    id,
    tool,
    color: "#111111",
    width: 3,
    startedAt,
    endedAt,
    points: [
      { x: 0.1, y: 0.1, t: startedAt },
      { x: 0.2, y: 0.2, t: endedAt },
    ],
  };
}

describe("thinking replay metrics", () => {
  it("detects long pauses, idle time, revisions, and a slow start", () => {
    const strokes = [
      stroke("a", 22_000, 24_000),
      stroke("b", 44_000, 46_000),
      stroke("erase", 47_000, 48_000, "eraser"),
    ];
    const actions: PaperAction[] = [
      { id: "undo", type: "undo", timestamp: 49_000, targetStrokeId: "b" },
      { id: "redo", type: "redo", timestamp: 50_000, targetStrokeId: "b" },
      { id: "clear", type: "clear", timestamp: 51_000 },
    ];
    const metrics = calculateSolutionMetrics(strokes, actions, 60);

    expect(metrics.strokeCount).toBe(2);
    expect(metrics.eraserStrokeCount).toBe(1);
    expect(metrics.undoCount).toBe(1);
    expect(metrics.redoCount).toBe(1);
    expect(metrics.clearCount).toBe(1);
    expect(metrics.longPauseCount).toBe(2);
    expect(metrics.firstStrokeDelaySeconds).toBe(22);
    expect(metrics.activeSeconds).toBe(5);
    expect(metrics.idleSeconds).toBe(55);
    expect(calculateRevisionMetrics(strokes, actions).hasRevisionCluster).toBe(
      true,
    );
    expect(createThinkingReplaySummary(metrics).observation).toContain(
      "20-second window",
    );
  });

  it("creates distinct pause and revision markers", () => {
    const markers = createReplayMarkers(
      [
        stroke("a", 50_000, 51_000),
        stroke("erase", 70_000, 71_000, "eraser"),
      ],
      [{ id: "undo", type: "undo", timestamp: 72_000, targetStrokeId: "a" }],
      80,
    );

    expect(markers.map((marker) => marker.type)).toEqual([
      "very_long_pause",
      "long_pause",
      "erase",
      "undo",
      "answer_written",
    ]);
  });

  it("tracks answer checks without counting them as revisions", () => {
    const strokes = [
      stroke("a", 12_000, 14_000),
      stroke("b", 22_000, 24_000),
      stroke("c", 32_000, 34_000),
      stroke("d", 42_000, 44_000),
    ];
    const actions: PaperAction[] = [
      {
        id: "wrong-answer",
        type: "answer_selected",
        timestamp: 55_000,
        answerChoice: "A",
        isCorrect: false,
      },
      {
        id: "correct-answer",
        type: "answer_selected",
        timestamp: 65_000,
        answerChoice: "C",
        isCorrect: true,
      },
    ];
    const metrics = calculateSolutionMetrics(strokes, actions, 75);
    const summary = createThinkingReplaySummary(metrics, strokes, actions);
    const markers = createReplayMarkers(strokes, actions, 75);

    expect(metrics.revisionCount).toBe(0);
    expect(summary.phases.map((phase) => phase.phase)).toEqual([
      "think",
      "plan",
      "execute",
      "verify",
    ]);
    expect(summary.phases.find((phase) => phase.phase === "verify")?.confidence).toBe(
      "high",
    );
    expect(summary.timeline.map((event) => event.label)).toContain(
      "Answer A incorrect",
    );
    expect(summary.timeline.map((event) => event.label)).toContain(
      "Answer C correct",
    );
    expect(markers.map((marker) => marker.label)).toContain(
      "Answer C - Correct",
    );
  });

  it("reconstructs undo, redo, and clear deterministically", () => {
    const strokes = [
      stroke("a", 1_000, 2_000),
      stroke("b", 3_000, 4_000),
      stroke("c", 8_000, 9_000),
    ];
    const actions: PaperAction[] = [
      { id: "undo", type: "undo", timestamp: 5_000, targetStrokeId: "b" },
      { id: "redo", type: "redo", timestamp: 6_000, targetStrokeId: "b" },
      { id: "clear", type: "clear", timestamp: 7_000 },
    ];

    expect(visibleStrokesAt(strokes, actions, 5_500).map((item) => item.id)).toEqual([
      "a",
    ]);
    expect(visibleStrokesAt(strokes, actions, 6_500).map((item) => item.id)).toEqual([
      "a",
      "b",
    ]);
    expect(visibleStrokesAt(strokes, actions, 10_000).map((item) => item.id)).toEqual([
      "c",
    ]);
  });

  it("classifies local process patterns without claiming handwriting recognition", () => {
    const metrics = calculateSolutionMetrics(
      [stroke("a", 50_000, 51_000), stroke("b", 100_000, 101_000)],
      [],
      120,
    );
    const summary = createThinkingReplaySummary(metrics);
    const report = createLocalSolutionAnalysis(metrics);

    expect(summary.processPattern).toBe("long_stuck");
    expect(report.source).toBe("local");
    expect(report.summary).toContain("does not read or recognize handwriting");
  });

  it("upgrades legacy saved papers with deterministic markers and summaries", () => {
    const legacy = {
      id: "legacy",
      studentId: "matt",
      questionId: "ratio-01",
      questionPrompt: "Legacy paper",
      createdAt: "2026-06-11T12:00:00.000Z",
      metrics: {
        durationSeconds: 30,
        activeSeconds: 1,
        strokeCount: 1,
        eraserStrokeCount: 0,
        undoCount: 1,
        pauseCount: 0,
        longestPauseSeconds: 0,
      },
      strokes: [stroke("legacy-stroke", 0, 1_000)],
      analysis: createLocalSolutionAnalysis(
        calculateSolutionMetrics([stroke("legacy-stroke", 0, 1_000)], [], 30),
      ),
    };
    const upgraded = normalizeSolutionPaperRecord(
      legacy as unknown as Parameters<typeof normalizeSolutionPaperRecord>[0],
    );

    expect(upgraded.actions).toHaveLength(1);
    expect(upgraded.actions[0].type).toBe("undo");
    expect(upgraded.attemptId).toBe("legacy");
    expect(upgraded.replayMarkers.at(-1)?.type).toBe("answer_written");
    expect(upgraded.thinkingReplaySummary.processPattern).toBe("rushed");
  });
});
