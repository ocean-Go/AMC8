import type {
  PaperAction,
  ReplayMarker,
  RevisionMetrics,
  SolutionAnalysis,
  SolutionPaperRecord,
  SolutionProcessMetrics,
  SolutionStroke,
  ThinkingPhase,
  ThinkingReplaySummary,
  ThinkingTimelineEvent,
} from "@/lib/domain";

export const LONG_PAUSE_THRESHOLD_SECONDS = 15;
export const VERY_LONG_PAUSE_THRESHOLD_SECONDS = 45;
const revisionClusterWindowMs = 20_000;

type ReplayEvent =
  | { timestamp: number; kind: "stroke"; stroke: SolutionStroke }
  | { timestamp: number; kind: "action"; action: PaperAction };

function orderedEvents(strokes: SolutionStroke[], actions: PaperAction[]) {
  const events: ReplayEvent[] = [
    ...strokes.map(
      (stroke): ReplayEvent => ({
        timestamp: stroke.startedAt,
        kind: "stroke",
        stroke,
      }),
    ),
    ...actions.map(
      (action): ReplayEvent => ({
        timestamp: action.timestamp,
        kind: "action",
        action,
      }),
    ),
  ];
  return events.sort(
    (a, b) =>
      a.timestamp - b.timestamp ||
      (a.kind === "stroke" ? -1 : 1),
  );
}

export function visibleStrokesAt(
  strokes: SolutionStroke[],
  actions: PaperAction[],
  timestampMs = Number.POSITIVE_INFINITY,
): SolutionStroke[] {
  const visible: SolutionStroke[] = [];

  for (const event of orderedEvents(strokes, actions)) {
    if (event.timestamp > timestampMs) break;
    if (event.kind === "stroke") {
      const points = event.stroke.points.filter((point) => point.t <= timestampMs);
      visible.push({
        ...event.stroke,
        points:
          timestampMs >= event.stroke.endedAt
            ? event.stroke.points
            : points.length
              ? points
              : event.stroke.points.slice(0, 1),
      });
      continue;
    }

    if (event.action.type === "clear") {
      visible.length = 0;
    } else if (event.action.type === "undo" && event.action.targetStrokeId) {
      const index = visible.findIndex(
        (stroke) => stroke.id === event.action.targetStrokeId,
      );
      if (index >= 0) visible.splice(index, 1);
    } else if (event.action.type === "redo" && event.action.targetStrokeId) {
      const stroke = strokes.find(
        (item) => item.id === event.action.targetStrokeId,
      );
      if (stroke && !visible.some((item) => item.id === stroke.id)) {
        visible.push(stroke);
      }
    }
  }

  return visible;
}

export function calculateRevisionMetrics(
  strokes: SolutionStroke[],
  actions: PaperAction[],
): RevisionMetrics {
  const revisionTimes = [
    ...strokes
      .filter((stroke) => stroke.tool === "eraser")
      .map((stroke) => stroke.startedAt),
    ...actions
      .filter((action) =>
        ["undo", "redo", "clear"].includes(action.type),
      )
      .map((action) => action.timestamp),
  ].sort((a, b) => a - b);
  const hasRevisionCluster = revisionTimes.some((start, index) => {
    const count = revisionTimes.filter(
      (timestamp) =>
        timestamp >= start && timestamp <= start + revisionClusterWindowMs,
    ).length;
    return index < revisionTimes.length && count >= 3;
  });
  const eraseCount = strokes.filter((stroke) => stroke.tool === "eraser").length;
  const undoCount = actions.filter((action) => action.type === "undo").length;
  const redoCount = actions.filter((action) => action.type === "redo").length;
  const clearCount = actions.filter((action) => action.type === "clear").length;

  return {
    eraseCount,
    undoCount,
    redoCount,
    clearCount,
    revisionCount: eraseCount + undoCount + redoCount + clearCount,
    hasRevisionCluster,
  };
}

export function createReplayMarkers(
  strokes: SolutionStroke[],
  actions: PaperAction[],
  totalTimeSeconds: number,
): ReplayMarker[] {
  const ordered = [...strokes].sort((a, b) => a.startedAt - b.startedAt);
  const markers: ReplayMarker[] = [];

  ordered.forEach((stroke, index) => {
    const previousEnd = index === 0 ? 0 : ordered[index - 1].endedAt;
    const pauseSeconds = Math.max(0, (stroke.startedAt - previousEnd) / 1000);
    if (pauseSeconds >= LONG_PAUSE_THRESHOLD_SECONDS) {
      const veryLong = pauseSeconds >= VERY_LONG_PAUSE_THRESHOLD_SECONDS;
      markers.push({
        id: `pause-${stroke.id}`,
        timestamp: Math.round((stroke.startedAt / 1000) * 10) / 10,
        type: veryLong ? "very_long_pause" : "long_pause",
        label: veryLong ? "Very long pause" : "Long pause",
        description: `${Math.round(pauseSeconds)} seconds without writing`,
      });
    }
    if (stroke.tool === "eraser") {
      markers.push({
        id: `erase-${stroke.id}`,
        timestamp: Math.round((stroke.startedAt / 1000) * 10) / 10,
        type: "erase",
        label: "Erase",
      });
    }
  });

  actions.forEach((action) => {
    if (action.type === "redo") return;
    if (action.type === "answer_selected") {
      markers.push({
        id: `answer-${action.id}`,
        timestamp: Math.round((action.timestamp / 1000) * 10) / 10,
        type: "answer_written",
        label: `Answer ${action.answerChoice ?? ""} - ${
          action.isCorrect ? "Correct" : "Incorrect"
        }`.trim(),
        description: "Answer checked",
      });
      return;
    }
    markers.push({
      id: `action-${action.id}`,
      timestamp: Math.round((action.timestamp / 1000) * 10) / 10,
      type: action.type,
      label: action.type === "undo" ? "Undo" : "Clear",
    });
  });

  markers.push({
    id: "paper-saved",
    timestamp: totalTimeSeconds,
    type: "answer_written",
    label: "Paper saved",
  });

  return markers.sort((a, b) => a.timestamp - b.timestamp);
}

export function calculateSolutionMetrics(
  strokes: SolutionStroke[],
  actionsOrDuration: PaperAction[] | number,
  durationOrUndo: number,
): SolutionProcessMetrics {
  const legacyCall = typeof actionsOrDuration === "number";
  const actions: PaperAction[] = legacyCall
    ? Array.from({ length: durationOrUndo }, (_, index) => ({
        id: `legacy-undo-${index}`,
        type: "undo" as const,
        timestamp: 0,
      }))
    : actionsOrDuration;
  const durationSeconds = legacyCall ? actionsOrDuration : durationOrUndo;
  const ordered = [...strokes].sort((a, b) => a.startedAt - b.startedAt);
  const pauseDurations = ordered.map((stroke, index) => {
    const previousEnd = index === 0 ? 0 : ordered[index - 1].endedAt;
    return Math.max(0, stroke.startedAt - previousEnd);
  });
  const longPauses = pauseDurations.filter(
    (pause) => pause >= LONG_PAUSE_THRESHOLD_SECONDS * 1000,
  );
  const veryLongPauses = pauseDurations.filter(
    (pause) => pause >= VERY_LONG_PAUSE_THRESHOLD_SECONDS * 1000,
  );
  const activeMilliseconds = ordered.reduce(
    (sum, stroke) => sum + Math.max(0, stroke.endedAt - stroke.startedAt),
    0,
  );
  const revision = calculateRevisionMetrics(strokes, actions);

  return {
    durationSeconds: Math.max(0, Math.round(durationSeconds)),
    activeSeconds: Math.max(0, Math.round(activeMilliseconds / 1000)),
    idleSeconds: Math.max(
      0,
      Math.round(durationSeconds - activeMilliseconds / 1000),
    ),
    strokeCount: ordered.filter((stroke) => stroke.tool === "pen").length,
    eraserStrokeCount: revision.eraseCount,
    undoCount: revision.undoCount,
    redoCount: revision.redoCount,
    clearCount: revision.clearCount,
    pauseCount: longPauses.length,
    longPauseCount: longPauses.length - veryLongPauses.length,
    veryLongPauseCount: veryLongPauses.length,
    longestPauseSeconds: longPauses.length
      ? Math.round(Math.max(...longPauses) / 1000)
      : 0,
    revisionCount: revision.revisionCount,
    revisionClusterDetected: revision.hasRevisionCluster,
    firstStrokeDelaySeconds: ordered.length
      ? Math.round(ordered[0].startedAt / 1000)
      : 0,
  };
}

export function createThinkingReplaySummary(
  metrics: SolutionProcessMetrics,
  strokes: SolutionStroke[] = [],
  actions: PaperAction[] = [],
): ThinkingReplaySummary {
  let processPattern: ThinkingReplaySummary["processPattern"] = "unknown";
  if (!metrics.durationSeconds || !metrics.strokeCount) {
    processPattern = "unknown";
  } else if (metrics.veryLongPauseCount >= 1) {
    processPattern = "long_stuck";
  } else if (metrics.revisionCount >= 5) {
    processPattern = "frequent_revision";
  } else if (metrics.firstStrokeDelaySeconds >= 20) {
    processPattern = "slow_start";
  } else if (metrics.strokeCount <= 3 && metrics.durationSeconds < 45) {
    processPattern = "rushed";
  } else if (metrics.strokeCount <= 3) {
    processPattern = "minimal_work";
  } else {
    processPattern = "smooth";
  }

  const observations: Record<
    ThinkingReplaySummary["processPattern"],
    string
  > = {
    smooth:
      "Matt wrote steadily with few long pauses or revisions. The process appears relatively stable.",
    slow_start:
      "Matt paused before meaningful writing, which may indicate that the starting strategy or problem-solving tool was unclear.",
    frequent_revision:
      "Matt revised the work several times. The plan may have changed during the solution instead of being selected before calculation.",
    long_stuck:
      "Matt had at least one very long pause. This suggests he may have stayed with an unproductive idea for too long.",
    minimal_work:
      "Matt recorded very little written structure, so it is difficult to verify the reasoning path.",
    rushed:
      "Matt finished quickly with little written structure. The process may not include enough checking or explanation.",
    unknown:
      "There is not enough process data to classify this solution reliably.",
  };
  const nextActions: Record<
    ThinkingReplaySummary["processPattern"],
    string
  > = {
    smooth:
      "Keep the same structure and add one final line that checks the answer against the question.",
    slow_start:
      "Before calculating, name one likely tool: draw a diagram, list cases, use a table, or work backwards.",
    frequent_revision:
      "Spend the first 20 seconds writing the target quantity and chosen tool before doing calculations.",
    long_stuck:
      "Use the two-minute AMC8 rule: if no path is working, mark the problem, skip it, and return later.",
    minimal_work:
      "Show at least one equation, diagram, table, or case list before writing the final answer.",
    rushed:
      "Use the saved time to check the question wording and verify one calculation.",
    unknown:
      "Complete another Solution Paper with the timer running from the start.",
  };
  const observation = metrics.revisionClusterDetected
    ? `${observations[processPattern]} Several revision actions occurred within a 20-second window.`
    : observations[processPattern];
  const phases = createThinkingPhases(metrics, strokes, actions);
  const timeline = createThinkingTimeline(metrics, phases, actions);

  return {
    totalTimeSeconds: metrics.durationSeconds,
    activeWritingSeconds: metrics.activeSeconds,
    idleTimeSeconds: metrics.idleSeconds,
    strokeCount: metrics.strokeCount,
    pauseCount: metrics.pauseCount,
    longPauseCount: metrics.longPauseCount,
    veryLongPauseCount: metrics.veryLongPauseCount,
    longestPauseSeconds: metrics.longestPauseSeconds,
    eraseCount: metrics.eraserStrokeCount,
    undoCount: metrics.undoCount,
    redoCount: metrics.redoCount,
    clearCount: metrics.clearCount,
    revisionCount: metrics.revisionCount,
    revisionClusterDetected: metrics.revisionClusterDetected,
    processPattern,
    phases,
    timeline,
    observation,
    suggestedNextAction: nextActions[processPattern],
  };
}

export function createThinkingPhases(
  metrics: SolutionProcessMetrics,
  strokes: SolutionStroke[],
  actions: PaperAction[],
): ThinkingPhase[] {
  const total = Math.max(0, metrics.durationSeconds);
  if (!total) return [];

  const ordered = [...strokes].sort((a, b) => a.startedAt - b.startedAt);
  const firstStroke = Math.min(
    total,
    ordered.length ? ordered[0].startedAt / 1000 : total,
  );
  const lastStroke = Math.min(
    total,
    ordered.length ? ordered.at(-1)!.endedAt / 1000 : firstStroke,
  );
  const answerActions = actions
    .filter((action) => action.type === "answer_selected")
    .sort((a, b) => a.timestamp - b.timestamp);
  const firstAnswer = answerActions.length
    ? Math.min(total, answerActions[0].timestamp / 1000)
    : null;
  const workEnd = Math.max(firstStroke, firstAnswer ?? lastStroke);
  const writtenWindow = Math.max(0, workEnd - firstStroke);
  const planDuration =
    writtenWindow > 0 ? Math.min(20, Math.max(2, writtenWindow * 0.2)) : 0;
  const planEnd = Math.min(workEnd, firstStroke + planDuration);
  const verifyStart = firstAnswer ?? lastStroke;

  const phases: ThinkingPhase[] = [];
  const addPhase = (
    phase: ThinkingPhase["phase"],
    startSeconds: number,
    endSeconds: number,
    confidence: ThinkingPhase["confidence"],
    evidence: string,
    commentary: string,
  ) => {
    const start = Math.max(0, Math.min(total, startSeconds));
    const end = Math.max(start, Math.min(total, endSeconds));
    if (end - start < 0.1) return;
    phases.push({
      phase,
      startSeconds: start,
      endSeconds: end,
      durationSeconds: Math.round((end - start) * 10) / 10,
      confidence,
      evidence,
      commentary,
    });
  };

  addPhase(
    "think",
    0,
    firstStroke,
    "high",
    `${Math.round(firstStroke)} seconds before the first stroke`,
    firstStroke >= LONG_PAUSE_THRESHOLD_SECONDS
      ? "Matt paused before writing. The starting strategy or tool may not have been clear yet."
      : "Matt began writing quickly after starting the timer.",
  );
  addPhase(
    "plan",
    firstStroke,
    planEnd,
    "low",
    "Early writing segment",
    "This segment is treated as planning from timing only. Local analytics cannot identify the written method.",
  );
  addPhase(
    "execute",
    planEnd,
    verifyStart,
    "medium",
    `${metrics.strokeCount} pen strokes and ${metrics.revisionCount} revision actions`,
    metrics.revisionCount >= 5
      ? "The main writing period included frequent revision, suggesting the plan changed during execution."
      : "Most recorded writing occurred here with a relatively stable action pattern.",
  );
  addPhase(
    "verify",
    verifyStart,
    total,
    firstAnswer === null ? "low" : "high",
    firstAnswer === null
      ? "Time after the final stroke"
      : `Answer checked at ${Math.round(firstAnswer)} seconds`,
    firstAnswer === null
      ? "This trailing time may include checking, but no answer-check event proves it."
      : "Matt checked an answer and then had time to review or revise before saving.",
  );

  return phases;
}

export function createThinkingTimeline(
  metrics: SolutionProcessMetrics,
  phases: ThinkingPhase[],
  actions: PaperAction[],
): ThinkingTimelineEvent[] {
  const events: ThinkingTimelineEvent[] = [
    {
      id: "timeline-start",
      timestamp: 0,
      type: "start",
      label: "Start",
      commentary: "Timer started before writing.",
    },
  ];

  phases.forEach((phase) => {
    events.push({
      id: `phase-${phase.phase}`,
      timestamp: phase.startSeconds,
      type: "phase_change",
      label: phase.phase[0].toUpperCase() + phase.phase.slice(1),
      commentary: phase.commentary,
    });
  });

  if (metrics.firstStrokeDelaySeconds >= LONG_PAUSE_THRESHOLD_SECONDS) {
    events.push({
      id: "timeline-start-pause",
      timestamp: metrics.firstStrokeDelaySeconds,
      type: "pause",
      label:
        metrics.firstStrokeDelaySeconds >= VERY_LONG_PAUSE_THRESHOLD_SECONDS
          ? "Very long opening pause"
          : "Long opening pause",
      commentary:
        "The delay before the first stroke may indicate difficulty selecting a starting strategy.",
    });
  }
  if (metrics.revisionClusterDetected) {
    const revisionActions = actions
      .filter((action) => ["undo", "redo", "clear"].includes(action.type))
      .sort((a, b) => a.timestamp - b.timestamp);
    events.push({
      id: "timeline-revision-cluster",
      timestamp: (revisionActions[0]?.timestamp ?? 0) / 1000,
      type: "revision",
      label: "Revision cluster",
      commentary:
        "Several revisions happened close together, suggesting uncertainty about the current path.",
    });
  }
  actions
    .filter((action) => action.type === "answer_selected")
    .forEach((action, index) => {
      events.push({
        id: `timeline-answer-${action.id}`,
        timestamp: action.timestamp / 1000,
        type: "answer",
        label: `Answer ${action.answerChoice ?? ""} ${
          action.isCorrect ? "correct" : "incorrect"
        }`.trim(),
        commentary: action.isCorrect
          ? "Matt selected the correct option. Remaining time can be used for verification."
          : "Matt selected an incorrect option and can use the replay to identify where the path changed.",
      });
      if (index > 0) {
        events.at(-1)!.commentary += " This was a revised answer.";
      }
    });
  events.push({
    id: "timeline-submit",
    timestamp: metrics.durationSeconds,
    type: "submit",
    label: "Submit",
    commentary: "Solution Paper saved.",
  });

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

export function createLocalSolutionAnalysis(
  metrics: SolutionProcessMetrics,
): SolutionAnalysis {
  const summary = createThinkingReplaySummary(metrics);
  return {
    source: "local",
    summary:
      "This local report uses stroke timing and revision behavior only. It does not read or recognize handwriting.",
    approach: ["Reconstructed the writing, pause, and revision timeline."],
    strengths:
      summary.processPattern === "smooth"
        ? ["The recorded process was steady and relatively stable."]
        : [],
    unclearPoints:
      summary.pauseCount || summary.revisionCount
        ? [summary.observation]
        : [],
    errors: [],
    suggestions: [summary.suggestedNextAction],
    notableIdea: null,
  };
}

export function normalizeSolutionPaperRecord(
  record: SolutionPaperRecord,
): SolutionPaperRecord {
  const actions =
    record.actions ??
    Array.from(
      { length: record.metrics?.undoCount ?? 0 },
      (_, index): PaperAction => ({
        id: `legacy-undo-${record.id}-${index}`,
        type: "undo",
        timestamp: 0,
      }),
    );
  const metrics = calculateSolutionMetrics(
    record.strokes ?? [],
    actions,
    record.metrics?.durationSeconds ?? 0,
  );
  const thinkingReplaySummary =
    record.thinkingReplaySummary?.phases &&
    record.thinkingReplaySummary?.timeline
      ? record.thinkingReplaySummary
      : createThinkingReplaySummary(metrics, record.strokes ?? [], actions);
  const answerActions = actions
    .filter((action) => action.type === "answer_selected")
    .sort((a, b) => a.timestamp - b.timestamp);
  const finalAnswerAction = answerActions.at(-1);
  const replayMarkers =
    record.replayMarkers?.length
      ? record.replayMarkers
      : createReplayMarkers(
          record.strokes ?? [],
          actions,
          metrics.durationSeconds,
        );

  return {
    ...record,
    attemptId: record.attemptId ?? record.id,
    updatedAt: record.updatedAt ?? record.createdAt,
    actions,
    metrics,
    replayMarkers,
    thinkingReplaySummary,
    studentAnswer: record.studentAnswer ?? finalAnswerAction?.answerChoice,
    answerCorrect: record.answerCorrect ?? finalAnswerAction?.isCorrect,
    answeredAtSeconds:
      record.answeredAtSeconds ??
      (finalAnswerAction ? finalAnswerAction.timestamp / 1000 : undefined),
    analysisStatus:
      record.analysisStatus ??
      (record.analysis?.source === "minimax"
        ? "vision_analyzed"
        : "local_analyzed"),
  };
}
