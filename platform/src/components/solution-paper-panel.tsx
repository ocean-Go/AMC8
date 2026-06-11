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
  CheckCircle2,
  CircleStop,
  Eraser,
  Maximize2,
  Minimize2,
  Pencil,
  Redo2,
  Save,
  Timer,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";
import { ThinkingReplayPanel } from "@/components/thinking-replay-panel";
import { practiceQuestions } from "@/data/practice-questions";
import type {
  AnswerChoice,
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
  const activePointerIdRef = useRef<number | null>(null);
  const lastPenInputRef = useRef(0);
  const [questionId, setQuestionId] = useState(practiceQuestions[0].id);
  const [strokes, setStrokes] = useState<SolutionStroke[]>([]);
  const [actions, setActions] = useState<PaperAction[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [penWidth, setPenWidth] = useState<2 | 3 | 5>(3);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTiming, setIsTiming] = useState(false);
  const [finished, setFinished] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerChoice | null>(null);
  const [answerResult, setAnswerResult] = useState<
    "correct" | "incorrect" | null
  >(null);
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

  useEffect(() => {
    if (!focusMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [focusMode]);

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

  function pointFromPointer(pointer: PointerEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (pointer.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (pointer.clientY - rect.top) / rect.height)),
      t: relativeTime(),
      pressure:
        pointer.pressure > 0
          ? Math.max(0.1, Math.min(1, pointer.pressure))
          : 0.5,
    };
  }

  function startStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isTiming || finished || !event.isPrimary) return;
    if (
      event.pointerType === "touch" &&
      Date.now() - lastPenInputRef.current < 1_200
    ) {
      return;
    }
    if (event.pointerType === "pen") lastPenInputRef.current = Date.now();
    event.preventDefault();
    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromPointer(event.nativeEvent, event.currentTarget);
    currentStrokeRef.current = {
      id: crypto.randomUUID(),
      tool,
      color: "#17372f",
      width: penWidth,
      startedAt: point.t,
      endedAt: point.t,
      points: [point],
    };
  }

  function continueStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = currentStrokeRef.current;
    const canvas = canvasRef.current;
    if (
      !stroke ||
      !canvas ||
      activePointerIdRef.current !== event.pointerId
    ) {
      return;
    }
    event.preventDefault();
    if (event.pointerType === "pen") lastPenInputRef.current = Date.now();
    const pointerEvents =
      event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    if (!context) return;
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
    pointerEvents.forEach((pointer) => {
      const point = pointFromPointer(pointer, canvas);
      const previous = stroke.points.at(-1);
      if (!previous) return;
      stroke.points.push(point);
      stroke.endedAt = point.t;
      const pressure =
        ((previous.pressure || 0.5) + (point.pressure || 0.5)) / 2;
      context.lineWidth =
        stroke.tool === "eraser"
          ? stroke.width * 3
          : stroke.width * (0.65 + pressure * 0.9);
      context.beginPath();
      context.moveTo(previous.x * rect.width, previous.y * rect.height);
      context.lineTo(point.x * rect.width, point.y * rect.height);
      context.stroke();
    });
    context.restore();
  }

  function finishStroke(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = currentStrokeRef.current;
    if (!stroke || activePointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    stroke.endedAt = relativeTime();
    currentStrokeRef.current = null;
    activePointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setStrokes((current) => [...current, stroke]);
    setRedoStack([]);
  }

  function resetPaper() {
    currentStrokeRef.current = null;
    activePointerIdRef.current = null;
    sessionStartRef.current = null;
    setStrokes([]);
    setActions([]);
    setRedoStack([]);
    setElapsedSeconds(0);
    setIsTiming(false);
    setFinished(false);
    setSelectedAnswer(null);
    setAnswerResult(null);
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

  function selectAnswer(answer: AnswerChoice) {
    if (!isTiming || finished) return;
    setSelectedAnswer(answer);
    setAnswerResult(null);
  }

  function checkAnswer() {
    if (!selectedAnswer || !isTiming || finished) return;
    const isCorrect = selectedAnswer === question.answer;
    setAnswerResult(isCorrect ? "correct" : "incorrect");
    setActions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: "answer_selected",
        timestamp: relativeTime(),
        answerChoice: selectedAnswer,
        isCorrect,
      },
    ]);
  }

  function finishAndSave() {
    if (
      !strokes.length ||
      sessionStartRef.current === null ||
      !selectedAnswer ||
      !answerResult
    ) {
      return;
    }
    const durationSeconds = Math.max(
      elapsedSeconds,
      Math.round((Date.now() - sessionStartRef.current) / 1000),
    );
    const metrics = calculateSolutionMetrics(strokes, actions, durationSeconds);
    const thinkingReplaySummary = createThinkingReplaySummary(
      metrics,
      strokes,
      actions,
    );
    const answerAction = actions
      .filter((action) => action.type === "answer_selected")
      .at(-1);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const record: SolutionPaperRecord = {
      id,
      studentId,
      questionId: question.id,
      attemptId: id,
      questionPrompt: question.prompt,
      studentAnswer: selectedAnswer,
      answerCorrect: answerResult === "correct",
      answeredAtSeconds: answerAction
        ? answerAction.timestamp / 1000
        : durationSeconds,
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
        <div aria-label="Answer choices" className="solution-choices">
          {(Object.entries(question.choices) as [AnswerChoice, string][]).map(
            ([choice, value]) => (
              <button
                aria-pressed={selectedAnswer === choice}
                className={[
                  selectedAnswer === choice ? "selected" : "",
                  selectedAnswer === choice && answerResult
                    ? answerResult
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={!isTiming || finished}
                key={choice}
                onClick={() => selectAnswer(choice)}
                type="button"
              >
                <strong>{choice}</strong> {value}
              </button>
            ),
          )}
        </div>
        <div className="answer-check-row" aria-live="polite">
          <button
            className="secondary-button"
            disabled={!selectedAnswer || !isTiming || finished}
            onClick={checkAnswer}
            type="button"
          >
            Check answer
          </button>
          {answerResult === "correct" && (
            <span className="answer-result correct">
              <CheckCircle2 size={16} /> Correct
            </span>
          )}
          {answerResult === "incorrect" && (
            <span className="answer-result incorrect">
              <XCircle size={16} /> Incorrect. Review your work and try again.
            </span>
          )}
        </div>
      </section>

      <section
        className={`panel solution-workspace thinking-workspace ${
          focusMode ? "focus-mode" : ""
        }`}
      >
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
          <div className="pen-width-group" aria-label="Pen size">
            {([2, 3, 5] as const).map((width) => (
              <button
                aria-label={`Pen size ${width}`}
                aria-pressed={penWidth === width}
                className={penWidth === width ? "active" : ""}
                disabled={!isTiming || finished}
                key={width}
                onClick={() => setPenWidth(width)}
                type="button"
              >
                <span style={{ height: width, width: width * 4 }} />
              </button>
            ))}
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
            <button
              aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
              onClick={() => setFocusMode((value) => !value)}
              type="button"
            >
              {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              {focusMode ? "Exit" : "Focus"}
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
          <div aria-label="Quick answer check" className="quick-answer-dock">
            {(["A", "B", "C", "D", "E"] as const).map((choice) => (
              <button
                aria-label={`Select answer ${choice}`}
                aria-pressed={selectedAnswer === choice}
                className={[
                  selectedAnswer === choice ? "selected" : "",
                  selectedAnswer === choice && answerResult
                    ? answerResult
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={!isTiming || finished}
                key={choice}
                onClick={() => selectAnswer(choice)}
                type="button"
              >
                {choice}
              </button>
            ))}
            <button
              aria-label="Check quick answer"
              className="check"
              disabled={!selectedAnswer || !isTiming || finished}
              onClick={checkAnswer}
              type="button"
            >
              {answerResult === "correct" ? (
                <CheckCircle2 size={16} />
              ) : answerResult === "incorrect" ? (
                <XCircle size={16} />
              ) : (
                "Check"
              )}
            </button>
          </div>
          {!answerResult && isTiming && (
            <span className="save-requirement">
              Select and check an answer before saving.
            </span>
          )}
          {finished ? (
            <button className="secondary-button" onClick={resetPaper} type="button">
              New paper
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={!strokes.length || !isTiming || !answerResult}
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
          key={selectedRecord.id}
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
