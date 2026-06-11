"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brain,
  CheckCircle2,
  Pause,
  Play,
  RefreshCcw,
  ScanSearch,
  XCircle,
} from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { practiceQuestions } from "@/data/practice-questions";
import type {
  SolutionAnalysis,
  SolutionPaperRecord,
  SolutionStroke,
  ThinkingReplayCoachContext,
} from "@/lib/domain";
import { visibleStrokesAt } from "@/lib/solution-paper";

interface ThinkingReplayPanelProps {
  record: SolutionPaperRecord;
  onAskCoach: (context: ThinkingReplayCoachContext) => void;
  onUpdate: (record: SolutionPaperRecord) => void;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(
    Math.floor(seconds % 60),
  ).padStart(2, "0")}`;
}

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: SolutionStroke,
  width: number,
  height: number,
) {
  if (!stroke.points.length) return;
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    const pressure = point.pressure || 0.5;
    const lineWidth =
      stroke.tool === "eraser"
        ? stroke.width * 3
        : stroke.width * (0.65 + pressure * 0.9);
    context.beginPath();
    context.arc(point.x * width, point.y * height, lineWidth / 2, 0, Math.PI * 2);
    context.fillStyle = context.strokeStyle;
    context.fill();
  } else {
    for (let index = 1; index < stroke.points.length; index += 1) {
      const previous = stroke.points[index - 1];
      const point = stroke.points[index];
      const pressure = ((previous.pressure || 0.5) + (point.pressure || 0.5)) / 2;
      context.lineWidth =
        stroke.tool === "eraser"
          ? stroke.width * 3
          : stroke.width * (0.65 + pressure * 0.9);
      context.beginPath();
      context.moveTo(previous.x * width, previous.y * height);
      context.lineTo(point.x * width, point.y * height);
      context.stroke();
    }
  }
  context.restore();
}

function paintReplay(
  canvas: HTMLCanvasElement,
  record: SolutionPaperRecord,
  timestampSeconds: number,
) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, rect.width, rect.height);
  visibleStrokesAt(
    record.strokes,
    record.actions,
    timestampSeconds * 1000,
  ).forEach((stroke) => drawStroke(context, stroke, rect.width, rect.height));
}

function analysisMarkdown(analysis: SolutionAnalysis) {
  const list = (title: string, items: string[]) =>
    items.length
      ? `### ${title}\n${items.map((item) => `- ${item}`).join("\n")}`
      : "";
  return [
    "## AI Vision analysis",
    analysis.summary,
    list("Strategy detected", analysis.approach),
    list("What went well", analysis.strengths),
    list("Unclear areas", analysis.unclearPoints),
    list("Possible errors", analysis.errors),
    list("Next improvement", analysis.suggestions),
    analysis.notableIdea ? `### Notable idea\n${analysis.notableIdea}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function ThinkingReplayPanel({
  record,
  onAskCoach,
  onUpdate,
}: ThinkingReplayPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const previousFrameRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [playing, setPlaying] = useState(false);
  const totalTime = Math.max(0.1, record.thinkingReplaySummary.totalTimeSeconds);
  const summary = record.thinkingReplaySummary;
  const activePhase = summary.phases.find(
    (phase) =>
      currentTime >= phase.startSeconds && currentTime <= phase.endSeconds,
  );

  const paint = useCallback(
    (timestamp = currentTime) => {
      if (canvasRef.current) paintReplay(canvasRef.current, record, timestamp);
    },
    [currentTime, record],
  );

  useEffect(() => {
    paint();
  }, [paint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => paint());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);

  useEffect(() => {
    if (!playing) {
      previousFrameRef.current = null;
      return;
    }
    const tick = (now: number) => {
      const previous = previousFrameRef.current ?? now;
      previousFrameRef.current = now;
      setCurrentTime((time) => {
        const next = time + ((now - previous) / 1000) * speed;
        if (next >= totalTime) {
          setPlaying(false);
          return totalTime;
        }
        return next;
      });
      frameRef.current = window.requestAnimationFrame(tick);
    };
    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [playing, speed, totalTime]);

  function restart() {
    setPlaying(false);
    setCurrentTime(0);
  }

  async function analyzeWithVision() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintReplay(canvas, record, totalTime);
    onUpdate({
      ...record,
      analysisStatus: "vision_analyzing",
      updatedAt: new Date().toISOString(),
    });
    const question = practiceQuestions.find(
      (item) => item.id === record.questionId,
    );
    try {
      const response = await fetch("/api/solution-paper/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionPrompt: record.questionPrompt,
          correctAnswer: question?.answer,
          studentAnswer: record.studentAnswer,
          imageDataUrl: canvas.toDataURL("image/png"),
          metrics: record.metrics,
          thinkingReplaySummary: record.thinkingReplaySummary,
          replayMarkers: record.replayMarkers,
        }),
      });
      if (!response.ok) throw new Error("Vision analysis failed");
      const analysis = (await response.json()) as SolutionAnalysis;
      if (analysis.source !== "minimax") throw new Error("Vision unavailable");
      onUpdate({
        ...record,
        analysis,
        analysisStatus: "vision_analyzed",
        updatedAt: new Date().toISOString(),
      });
    } catch {
      onUpdate({
        ...record,
        analysisStatus: "vision_failed",
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return (
    <section className="panel thinking-replay">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Thinking replay</p>
          <h3>{record.questionPrompt}</h3>
        </div>
        <span className={`process-badge pattern-${summary.processPattern}`}>
          {summary.processPattern.replaceAll("_", " ")}
        </span>
      </div>
      {record.studentAnswer && (
        <div
          className={`saved-answer ${
            record.answerCorrect ? "correct" : "incorrect"
          }`}
        >
          {record.answerCorrect ? (
            <CheckCircle2 size={16} />
          ) : (
            <XCircle size={16} />
          )}
          Matt selected {record.studentAnswer}:{" "}
          {record.answerCorrect ? "Correct" : "Incorrect"}
        </div>
      )}

      <div className="thinking-replay-grid">
        <div>
          <canvas
            aria-label="Thinking replay canvas"
            className="replay-canvas"
            ref={canvasRef}
          />
          <div className="replay-controls">
            <button
              aria-label={playing ? "Pause replay" : "Play replay"}
              onClick={() => setPlaying((value) => !value)}
              type="button"
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button aria-label="Restart replay" onClick={restart} type="button">
              <RefreshCcw size={16} />
            </button>
            <div className="replay-speed" aria-label="Replay speed">
              {([1, 2, 4] as const).map((value) => (
                <button
                  className={speed === value ? "active" : ""}
                  key={value}
                  onClick={() => setSpeed(value)}
                  type="button"
                >
                  {value}x
                </button>
              ))}
            </div>
            <strong>
              {formatTime(currentTime)} / {formatTime(totalTime)}
            </strong>
          </div>

          <div className="replay-timeline">
            <input
              aria-label="Replay progress"
              max={totalTime}
              min={0}
              onChange={(event) => {
                setPlaying(false);
                setCurrentTime(Number(event.target.value));
              }}
              step={0.1}
              type="range"
              value={Math.min(currentTime, totalTime)}
            />
            <div className="marker-track">
              {record.replayMarkers.map((marker) => (
                <button
                  aria-label={`${marker.label} at ${formatTime(marker.timestamp)}`}
                  className={`timeline-marker marker-${marker.type}`}
                  key={marker.id}
                  onClick={() => {
                    setPlaying(false);
                    setCurrentTime(marker.timestamp);
                  }}
                  style={{
                    left: `${Math.min(100, (marker.timestamp / totalTime) * 100)}%`,
                  }}
                  title={`${formatTime(marker.timestamp)} ${marker.label}${
                    marker.description ? `: ${marker.description}` : ""
                  }`}
                  type="button"
                />
              ))}
            </div>
          </div>

          <div className="phase-replay">
            <div className="phase-replay-heading">
              <strong>Thinking phases</strong>
              <span>
                {activePhase
                  ? `${activePhase.phase} (${activePhase.confidence} confidence)`
                  : "Move the replay to inspect a phase"}
              </span>
            </div>
            <div className="phase-track" aria-label="Thinking phase timeline">
              {summary.phases.map((phase) => (
                <button
                  aria-label={`${phase.phase}, ${Math.round(
                    phase.durationSeconds,
                  )} seconds, ${phase.confidence} confidence`}
                  className={`phase-segment phase-${phase.phase} ${
                    activePhase?.phase === phase.phase ? "active" : ""
                  }`}
                  key={phase.phase}
                  onClick={() => {
                    setPlaying(false);
                    setCurrentTime(phase.startSeconds);
                  }}
                  style={{
                    left: `${(phase.startSeconds / totalTime) * 100}%`,
                    width: `${Math.max(
                      2,
                      (phase.durationSeconds / totalTime) * 100,
                    )}%`,
                  }}
                  title={`${phase.phase}: ${phase.evidence}`}
                  type="button"
                >
                  <span>{phase.phase}</span>
                </button>
              ))}
            </div>
            <div className="phase-cards">
              {summary.phases.map((phase) => (
                <button
                  className={activePhase?.phase === phase.phase ? "active" : ""}
                  key={phase.phase}
                  onClick={() => {
                    setPlaying(false);
                    setCurrentTime(phase.startSeconds);
                  }}
                  type="button"
                >
                  <span>{phase.phase}</span>
                  <strong>{formatTime(phase.durationSeconds)}</strong>
                  <small>{phase.confidence} confidence</small>
                  <p>{phase.commentary}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="marker-list">
            {record.replayMarkers.map((marker) => (
              <button
                key={marker.id}
                onClick={() => setCurrentTime(marker.timestamp)}
                type="button"
              >
                <strong>{formatTime(marker.timestamp)}</strong>
                <span>{marker.label}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="process-summary">
          <div className="panel-heading">
            <h3>Process summary</h3>
            <span className="status-pill">Local analytics</span>
          </div>
          <div className="process-metrics">
            <div><strong>{formatTime(summary.totalTimeSeconds)}</strong><span>Total time</span></div>
            <div><strong>{formatTime(summary.activeWritingSeconds)}</strong><span>Active writing</span></div>
            <div><strong>{formatTime(summary.idleTimeSeconds)}</strong><span>Idle time</span></div>
            <div><strong>{summary.pauseCount}</strong><span>Long pauses</span></div>
            <div><strong>{summary.revisionCount}</strong><span>Revisions</span></div>
            <div><strong>{summary.strokeCount}</strong><span>Pen strokes</span></div>
          </div>
          <p>{summary.observation}</p>
          <div className="next-action">
            <strong>Suggested next action</strong>
            <span>{summary.suggestedNextAction}</span>
          </div>
          <p className="local-analysis-note">
            This local summary uses timing and editing behavior only. It does not
            recognize handwriting.
          </p>
          <div className="replay-actions">
            <button
              className="secondary-button"
              disabled={record.analysisStatus === "vision_analyzing"}
              onClick={() => void analyzeWithVision()}
              type="button"
            >
              <ScanSearch size={16} />
              {record.analysisStatus === "vision_analyzing"
                ? "Analyzing..."
                : "Analyze with AI Vision"}
            </button>
            <button
              className="primary-button"
              onClick={() =>
                onAskCoach({
                  questionId: record.questionId,
                  questionPrompt: record.questionPrompt,
                  ...summary,
                })
              }
              type="button"
            >
              <Brain size={16} /> Ask AI Coach
            </button>
          </div>
          {record.analysisStatus === "vision_failed" && (
            <p className="vision-status failed">
              AI Vision was unavailable. The local process summary remains valid.
            </p>
          )}
        </aside>
      </div>

      <div className="thinking-timeline-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Evidence-based commentary</p>
            <h3>Thinking timeline</h3>
          </div>
          <span className="status-pill">Timing + actions</span>
        </div>
        <div className="thinking-timeline-list">
          {summary.timeline.map((event) => (
            <button
              key={event.id}
              onClick={() => {
                setPlaying(false);
                setCurrentTime(event.timestamp);
              }}
              type="button"
            >
              <strong>{formatTime(event.timestamp)}</strong>
              <span className={`timeline-event-dot event-${event.type}`} />
              <div>
                <h4>{event.label}</h4>
                <p>{event.commentary}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="local-analysis-note">
          Phase labels are deterministic timing inferences, not handwriting
          recognition. AI Vision may refine the interpretation after it reads
          the visible page successfully.
        </p>
      </div>

      {record.analysisStatus === "vision_analyzed" &&
        record.analysis?.source === "minimax" && (
          <div className="vision-report">
            <div className="panel-heading">
              <h3>AI Vision analysis</h3>
              <span className="status-pill">MiniMax vision</span>
            </div>
            <MessageResponse>{analysisMarkdown(record.analysis)}</MessageResponse>
          </div>
        )}
    </section>
  );
}
