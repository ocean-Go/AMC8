"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  CircleStop,
  Eraser,
  Pencil,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { practiceQuestions } from "@/data/practice-questions";
import type {
  SolutionAnalysis,
  SolutionPaperRecord,
  SolutionStroke,
  StudentId,
} from "@/lib/domain";
import {
  calculateSolutionMetrics,
  createLocalSolutionAnalysis,
} from "@/lib/solution-paper";

interface SolutionPaperPanelProps {
  studentId: StudentId;
  records: SolutionPaperRecord[];
  onSave: (record: SolutionPaperRecord) => void;
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
  context.lineWidth = stroke.tool === "eraser" ? stroke.width * 3 : stroke.width;
  context.beginPath();
  stroke.points.forEach((point, index) => {
    const x = point.x * width;
    const y = point.y * height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    context.lineTo(point.x * width + 0.1, point.y * height + 0.1);
  }
  context.stroke();
  context.restore();
}

function paintCanvas(canvas: HTMLCanvasElement, strokes: SolutionStroke[]) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(rect.width * dpr)) {
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, rect.width, rect.height);
  strokes.forEach((stroke) => drawStroke(context, stroke, rect.width, rect.height));
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function analysisMarkdown(analysis: SolutionAnalysis) {
  const list = (title: string, items: string[]) =>
    items.length ? `### ${title}\n${items.map((item) => `- ${item}`).join("\n")}` : "";
  return [
    `## Process review`,
    analysis.summary,
    list("Approach detected", analysis.approach),
    list("What went well", analysis.strengths),
    list("Where the thinking became unclear", analysis.unclearPoints),
    list("Errors or risks", analysis.errors),
    list("Try next", analysis.suggestions),
    analysis.notableIdea ? `### Notable idea\n${analysis.notableIdea}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function SolutionPaperPanel({
  studentId,
  records,
  onSave,
}: SolutionPaperPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStrokeRef = useRef<SolutionStroke | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const replayTimersRef = useRef<number[]>([]);
  const [questionId, setQuestionId] = useState(practiceQuestions[0].id);
  const [strokes, setStrokes] = useState<SolutionStroke[]>([]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [undoCount, setUndoCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTiming, setIsTiming] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SolutionAnalysis | null>(null);
  const question =
    practiceQuestions.find((item) => item.id === questionId) ?? practiceQuestions[0];

  const redraw = useCallback(
    (nextStrokes = strokes) => {
      if (canvasRef.current) paintCanvas(canvasRef.current, nextStrokes);
    },
    [strokes],
  );

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => redraw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  useEffect(() => {
    if (!isTiming || sessionStartRef.current === null) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds(
        Math.floor((Date.now() - (sessionStartRef.current ?? Date.now())) / 1000),
      );
    }, 500);
    return () => window.clearInterval(interval);
  }, [isTiming]);

  useEffect(
    () => () => replayTimersRef.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );

  function relativeTime() {
    if (sessionStartRef.current === null) {
      sessionStartRef.current = Date.now();
      setIsTiming(true);
    }
    return Date.now() - (sessionStartRef.current ?? Date.now());
  }

  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      t: relativeTime(),
    };
  }

  function startStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (isReplaying || isAnalyzing) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    currentStrokeRef.current = {
      id: crypto.randomUUID(),
      tool,
      color: "#17372f",
      width: 3,
      startedAt: point.t,
      endedAt: point.t,
      points: [point],
    };
  }

  function continueStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = currentStrokeRef.current;
    const canvas = canvasRef.current;
    if (!stroke || !canvas) return;
    const point = pointFromEvent(event);
    const previous = stroke.points.at(-1);
    stroke.points.push(point);
    stroke.endedAt = point.t;
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    if (!context || !previous) return;
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
    context.lineWidth = stroke.tool === "eraser" ? stroke.width * 3 : stroke.width;
    context.beginPath();
    context.moveTo(previous.x * rect.width, previous.y * rect.height);
    context.lineTo(point.x * rect.width, point.y * rect.height);
    context.stroke();
    context.restore();
  }

  function finishStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = currentStrokeRef.current;
    if (!stroke) return;
    stroke.endedAt = relativeTime();
    currentStrokeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setStrokes((current) => [...current, stroke]);
    setAnalysis(null);
  }

  function resetPaper() {
    replayTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    replayTimersRef.current = [];
    currentStrokeRef.current = null;
    sessionStartRef.current = null;
    setStrokes([]);
    setUndoCount(0);
    setElapsedSeconds(0);
    setIsTiming(false);
    setIsReplaying(false);
    setAnalysis(null);
    if (canvasRef.current) paintCanvas(canvasRef.current, []);
  }

  function undo() {
    if (!strokes.length || isReplaying) return;
    setStrokes((current) => current.slice(0, -1));
    setUndoCount((count) => count + 1);
    setAnalysis(null);
  }

  function replay() {
    if (!strokes.length || !canvasRef.current) return;
    replayTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    setIsReplaying(true);
    paintCanvas(canvasRef.current, []);
    const firstTime = strokes[0].startedAt;
    strokes.forEach((stroke, index) => {
      const delay = Math.min(8_000, Math.max(0, (stroke.startedAt - firstTime) / 4));
      const timer = window.setTimeout(() => {
        redraw(strokes.slice(0, index + 1));
        if (index === strokes.length - 1) setIsReplaying(false);
      }, delay);
      replayTimersRef.current.push(timer);
    });
  }

  async function analyze() {
    const canvas = canvasRef.current;
    if (!canvas || !strokes.length) return;
    setIsTiming(false);
    setIsAnalyzing(true);
    const metrics = calculateSolutionMetrics(strokes, elapsedSeconds, undoCount);
    try {
      const response = await fetch("/api/solution-paper/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionPrompt: question.prompt,
          imageDataUrl: canvas.toDataURL("image/png"),
          metrics,
        }),
      });
      if (!response.ok) throw new Error("Analysis failed");
      const nextAnalysis = (await response.json()) as SolutionAnalysis;
      setAnalysis(nextAnalysis);
      onSave({
        id: crypto.randomUUID(),
        studentId,
        questionId: question.id,
        questionPrompt: question.prompt,
        createdAt: new Date().toISOString(),
        metrics,
        strokes,
        analysis: nextAnalysis,
      });
    } catch {
      const fallback = createLocalSolutionAnalysis(metrics);
      setAnalysis(fallback);
      onSave({
        id: crypto.randomUUID(),
        studentId,
        questionId: question.id,
        questionPrompt: question.prompt,
        createdAt: new Date().toISOString(),
        metrics,
        strokes,
        analysis: fallback,
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="page-heading">
        <div>
          <p className="eyebrow">AI solution paper - MVP</p>
          <h2>Write, replay, understand.</h2>
        </div>
        <p>
          The paper records pen strokes, revisions, pauses, and total time. MiniMax
          reviews the final page together with the process timeline.
        </p>
      </header>

      <section className="solution-question panel">
        <label>
          Practice problem
          <select
            onChange={(event) => {
              setQuestionId(event.target.value);
              resetPaper();
            }}
            value={questionId}
          >
            {practiceQuestions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.domain}: {item.prompt.slice(0, 65)}
              </option>
            ))}
          </select>
        </label>
        <h3>{question.prompt}</h3>
        <div className="solution-choices">
          {Object.entries(question.choices).map(([choice, value]) => (
            <span key={choice}>
              <strong>{choice}</strong> {value}
            </span>
          ))}
        </div>
      </section>

      <div className="solution-layout">
        <section className="panel solution-workspace">
          <div className="solution-toolbar">
            <div className="tool-group" aria-label="Drawing tools">
              <button
                className={tool === "pen" ? "active" : ""}
                onClick={() => setTool("pen")}
                type="button"
              >
                <Pencil size={16} /> Pen
              </button>
              <button
                className={tool === "eraser" ? "active" : ""}
                onClick={() => setTool("eraser")}
                type="button"
              >
                <Eraser size={16} /> Eraser
              </button>
            </div>
            <div className="solution-timer" aria-label="Solution time">
              {isTiming ? <CircleStop size={15} /> : <span className="timer-dot" />}
              {formatTime(elapsedSeconds)}
            </div>
            <div className="tool-group">
              <button disabled={!strokes.length} onClick={undo} type="button">
                <Undo2 size={16} /> Undo
              </button>
              <button disabled={!strokes.length} onClick={replay} type="button">
                {isReplaying ? <RotateCcw size={16} /> : <Play size={16} />}
                {isReplaying ? "Replaying" : "Replay"}
              </button>
              <button disabled={!strokes.length} onClick={resetPaper} type="button">
                <Trash2 size={16} /> Clear
              </button>
            </div>
          </div>

          <canvas
            aria-label="Digital solution paper"
            className={`solution-canvas tool-${tool}`}
            onPointerCancel={finishStroke}
            onPointerDown={startStroke}
            onPointerMove={continueStroke}
            onPointerUp={finishStroke}
            ref={canvasRef}
          />

          <div className="solution-status">
            <span>{strokes.filter((stroke) => stroke.tool === "pen").length} pen strokes</span>
            <span>{strokes.filter((stroke) => stroke.tool === "eraser").length} eraser strokes</span>
            <span>{undoCount} undo actions</span>
            <button
              className="primary-button"
              disabled={!strokes.length || isAnalyzing || isReplaying}
              onClick={() => void analyze()}
            >
              <Sparkles size={16} />
              {isAnalyzing ? "Analyzing..." : "Finish & analyze"}
            </button>
          </div>
        </section>

        <aside className="panel solution-analysis">
          <div className="panel-heading">
            <h3>AI process review</h3>
            {analysis && (
              <span className="status-pill">
                {analysis.source === "minimax" ? "MiniMax vision" : "Local fallback"}
              </span>
            )}
          </div>
          {analysis ? (
            <MessageResponse>{analysisMarkdown(analysis)}</MessageResponse>
          ) : (
            <div className="solution-empty">
              <Sparkles size={28} />
              <p>
                Complete your work, then ask AI to explain the approach, identify
                unclear steps, and suggest one concrete improvement.
              </p>
            </div>
          )}
        </aside>
      </div>

      <section className="panel solution-history">
        <div className="panel-heading">
          <h3>Recent solution papers</h3>
          <span className="status-pill">{records.length} saved</span>
        </div>
        {records.length === 0 ? (
          <p className="history-empty">Analyzed papers will appear here.</p>
        ) : (
          <div className="solution-record-grid">
            {records.slice(0, 6).map((record) => (
              <article key={record.id}>
                <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                <h4>{record.questionPrompt}</h4>
                <p>{record.analysis.summary}</p>
                <div>
                  <strong>{formatTime(record.metrics.durationSeconds)}</strong>
                  <small>{record.metrics.pauseCount} long pauses</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
