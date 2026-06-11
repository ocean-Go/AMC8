import type {
  SolutionAnalysis,
  SolutionProcessMetrics,
  SolutionStroke,
} from "@/lib/domain";

const meaningfulPauseMs = 5_000;

export function calculateSolutionMetrics(
  strokes: SolutionStroke[],
  durationSeconds: number,
  undoCount: number,
): SolutionProcessMetrics {
  const ordered = [...strokes].sort((a, b) => a.startedAt - b.startedAt);
  const pauses = ordered.slice(1).map((stroke, index) =>
    Math.max(0, stroke.startedAt - ordered[index].endedAt),
  );
  const meaningfulPauses = pauses.filter((pause) => pause >= meaningfulPauseMs);
  const activeMilliseconds = ordered.reduce(
    (sum, stroke) => sum + Math.max(0, stroke.endedAt - stroke.startedAt),
    0,
  );

  return {
    durationSeconds: Math.max(0, Math.round(durationSeconds)),
    activeSeconds: Math.max(0, Math.round(activeMilliseconds / 1000)),
    strokeCount: ordered.filter((stroke) => stroke.tool === "pen").length,
    eraserStrokeCount: ordered.filter((stroke) => stroke.tool === "eraser").length,
    undoCount,
    pauseCount: meaningfulPauses.length,
    longestPauseSeconds: meaningfulPauses.length
      ? Math.round(Math.max(...meaningfulPauses) / 1000)
      : 0,
  };
}

export function createLocalSolutionAnalysis(
  metrics: SolutionProcessMetrics,
): SolutionAnalysis {
  const strengths = [
    metrics.strokeCount >= 4
      ? "You recorded enough written work to review the solution process."
      : "You kept the written work concise.",
  ];
  const unclearPoints: string[] = [];
  const suggestions: string[] = [];

  if (metrics.pauseCount > 0) {
    unclearPoints.push(
      `There ${metrics.pauseCount === 1 ? "was" : "were"} ${metrics.pauseCount} long pause${metrics.pauseCount === 1 ? "" : "s"}; the longest was ${metrics.longestPauseSeconds} seconds.`,
    );
    suggestions.push(
      'At the next long pause, write a short note such as "find the ratio" or "draw a diagram" before continuing.',
    );
  }
  if (metrics.eraserStrokeCount + metrics.undoCount >= 3) {
    unclearPoints.push("Several revisions suggest that one part of the plan was unstable.");
    suggestions.push(
      "Separate planning from calculation: write the target quantity first, then choose the operation.",
    );
  }
  if (metrics.strokeCount < 4) {
    unclearPoints.push("There is very little visible reasoning to verify.");
    suggestions.push("Show at least one equation or diagram before the final answer.");
  }
  if (metrics.durationSeconds > 180) {
    suggestions.push(
      "After three minutes, pause and try a second representation: table, diagram, equation, or smaller case.",
    );
  }
  if (!suggestions.length) {
    suggestions.push(
      "Add a one-line conclusion that connects the calculation back to what the problem asks.",
    );
  }

  return {
    source: "local",
    summary:
      "This fallback report uses timing and editing behavior only. Handwriting content was not interpreted because MiniMax analysis was unavailable.",
    approach: ["Recorded the written sequence and revision pattern."],
    strengths,
    unclearPoints,
    errors: [],
    suggestions,
    notableIdea: null,
  };
}
