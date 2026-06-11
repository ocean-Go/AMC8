"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  CircleStop,
  Eraser,
  Pencil,
  Redo2,
  Save,
  Timer,
  Trash2,
  Undo2,
} from "lucide-react";
import { ThinkingReplayPanel } from "@/components/thinking-replay-panel";
import { practiceQuestions } from "@/data/practice-questions";
import type {
  PaperAction,
  SolutionPaperRecord,
  SolutionStroke,
  StudentId,
  ThinkingReplayCoachContext,
} from "@/lib/domain";
import {
  calculateSolutionMetrics,
  createLocalSolutionAnalysis,
  createReplayMarkers,
  createThinkingReplaySummary,
  visibleStrokesAt,
} from "@/lib/solution-paper";

interface SolutionPaperPanelProps {
  studentId: StudentId;
  records: SolutionPaperRecord[];
  onAskCoach: (context: ThinkingReplayCoachContext) => void;
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
  context.stroke();
  context.restore();
}

function paintCanvas(canvas: HTMLCanvasElement, strokes: SolutionStroke[]) {
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
  strokes.forEach((stroke) => drawStroke(context, stroke, rect.width, rect.height));
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(
    2,
    "0",
  )}`;
}

export function SolutionPaperPanel({
  studentId,
  records,
  onAskCoach,
  onSave,
}: SolutionPaperPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStrokeRef = useRef<SolutionStroke | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const [questionId, setQuestionId] = useState(practiceQuestions[0].id);
  const [strokes, setStrokes] = useState<SolutionStroke[]>([]);
  const [actions, setActions] = useState<PaperAction[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTiming, setIsTiming] = useState(false);
  const [finished, setFinished] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    records[0]?.id ?? null,
  );
  const question =
    practiceQuestions.find((item) => item.id === questionId) ?? practiceQuestions[0];
  const visibleStrokes = useMemo(
    () => visibleStrokesAt(strokes, actions),
    [actions, strokes],
  );
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? null;

  const redraw = useCallback(() => {
    if (canvasRef.current) paintCanvas(canvasRef.current, visibleStrokes);
  }, [visibleStrokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(redraw);
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

  function startSolving() {
    if (isTiming || finished) return;
    sessionStartRef.current = Date.now();
    setElapsedSeconds(0);
    setIsTiming(true);
  }

  function relativeTime() {
    return sessionStartRef.current === null
      ? 0
      : Date.now() - sessionStartRef.current;
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
    if (!isTiming || finished) return;
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
    setRedoStack([]);
  }

  function resetPaper() {
    currentStrokeRef.current = null;
    sessionStartRef.current = null;
    setStrokes([]);
    setActions([]);
    setRedoStack([]);
    setElapsedSeconds(0);
    setIsTiming(false);
    setFinished(false);
    if (canvasRef.current) paintCanvas(canvasRef.current, []);
  }

  function undo() {
    const target = visibleStrokes.at(-1);
    if (!target || !isTiming || finished) return;
    setActions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: "undo",
        timestamp: relativeTime(),
        targetStrokeId: target.id,
      },
    ]);
    setRedoStack((current) => [...current, target.id]);
  }

  function redo() {
    const targetStrokeId = redoStack.at(-1);
    if (!targetStrokeId || !isTiming || finished) return;
    setActions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: "redo",
        timestamp: relativeTime(),
        targetStrokeId,
      },
    ]);
    setRedoStack((current) => current.slice(0, -1));
  }

  function clearCanvas() {
    if (!visibleStrokes.length || !isTiming || finished) return;
    setActions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: "clear",
        timestamp: relativeTime(),
      },
    ]);
    setRedoStack([]);
  }

  function finishAndSave() {
    if (!strokes.length || sessionStartRef.current === null) return;
    const durationSeconds = Math.max(
      elapsedSeconds,
      Math.round((Date.now() - sessionStartRef.current) / 1000),
    );
    const metrics = calculateSolutionMetrics(strokes, actions, durationSeconds);
    const thinkingReplaySummary = createThinkingReplaySummary(metrics);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const record: SolutionPaperRecord = {
      id,
      studentId,
      questionId: question.id,
      attemptId: id,
      questionPrompt: question.prompt,
      createdAt: now,
      updatedAt: now,
      metrics,
      strokes,
      actions,
      replayMarkers: createReplayMarkers(strokes, actions, durationSeconds),
      thinkingReplaySummary,
      analysis: createLocalSolutionAnalysis(metrics),
      analysisStatus: "local_analyzed",
    };
    setElapsedSeconds(durationSeconds);
    setIsTiming(false);
    setFinished(true);
    setSelectedRecordId(id);
    onSave(record);
  }

  return (
    <div className="space-y-6">
      <header className="page-heading">
        <div>
          <p className="eyebrow">AI solution paper - Thinking Replay</p>
          <h2>Replay the work. Understand the thinking.</h2>
        </div>
        <p>
          Records Matt&apos;s strokes, pauses, revisions, active writing, and
          idle time. Local process analytics always work; AI Vision is optional.
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

      <section className="panel solution-workspace thinking-workspace">
        <div className="solution-toolbar">
          <div className="tool-group" aria-label="Drawing tools">
            <button
              className={tool === "pen" ? "active" : ""}
              disabled={!isTiming || finished}
              onClick={() => setTool("pen")}
              type="button"
            >
              <Pencil size={16} /> Pen
            </button>
            <button
              className={tool === "eraser" ? "active" : ""}
              disabled={!isTiming || finished}
              onClick={() => setTool("eraser")}
              type="button"
            >
              <Eraser size={16} /> Eraser
            </button>
          </div>
          <div className="solution-timer" aria-label="Solution time">
            {isTiming ? <CircleStop size={15} /> : <Timer size={15} />}
            {formatTime(elapsedSeconds)}
          </div>
          <div className="tool-group">
            <button disabled={!visibleStrokes.length || finished} onClick={undo} type="button">
              <Undo2 size={16} /> Undo
            </button>
            <button disabled={!redoStack.length || finished} onClick={redo} type="button">
              <Redo2 size={16} /> Redo
            </button>
            <button disabled={!visibleStrokes.length || finished} onClick={clearCanvas} type="button">
              <Trash2 size={16} /> Clear
            </button>
          </div>
        </div>

        {!isTiming && !finished && (
          <div className="start-solving">
            <Timer size={24} />
            <h3>Start the timer before writing</h3>
            <p>This captures any pause before Matt chooses a starting strategy.</p>
            <button className="primary-button" onClick={startSolving} type="button">
              Start solving
            </button>
          </div>
        )}

        <canvas
          aria-label="Digital solution paper"
          className={`solution-canvas tool-${tool} ${!isTiming ? "inactive" : ""}`}
          onPointerCancel={finishStroke}
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={finishStroke}
          ref={canvasRef}
        />

        <div className="solution-status">
          <span>{strokes.filter((stroke) => stroke.tool === "pen").length} pen strokes</span>
          <span>{strokes.filter((stroke) => stroke.tool === "eraser").length} erase actions</span>
          <span>{actions.filter((action) => action.type === "undo").length} undo actions</span>
          {finished ? (
            <button className="secondary-button" onClick={resetPaper} type="button">
              New paper
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={!strokes.length || !isTiming}
              onClick={finishAndSave}
              type="button"
            >
              <Save size={16} /> Finish & save replay
            </button>
          )}
        </div>
      </section>

      {selectedRecord && (
        <ThinkingReplayPanel
          onAskCoach={onAskCoach}
          onUpdate={onSave}
          record={selectedRecord}
        />
      )}

      <section className="panel solution-history">
        <div className="panel-heading">
          <h3>Saved thinking replays</h3>
          <span className="status-pill">{records.length} saved</span>
        </div>
        {records.length === 0 ? (
          <p className="history-empty">Finished papers will appear here.</p>
        ) : (
          <div className="solution-record-grid">
            {records.slice(0, 8).map((record) => (
              <button
                className={selectedRecordId === record.id ? "selected" : ""}
                key={record.id}
                onClick={() => setSelectedRecordId(record.id)}
                type="button"
              >
                <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                <h4>{record.questionPrompt}</h4>
                <p>{record.thinkingReplaySummary.observation}</p>
                <div>
                  <strong>
                    {formatTime(record.thinkingReplaySummary.totalTimeSeconds)}
                  </strong>
                  <small>
                    {record.thinkingReplaySummary.processPattern.replaceAll("_", " ")}
                  </small>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
