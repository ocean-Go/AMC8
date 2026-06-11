"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, TimerReset } from "lucide-react";
import type {
  AnswerChoice,
  Contest,
  MockAttempt,
  StudentId,
} from "@/lib/domain";
import { scoreContest } from "@/lib/learning";

interface MockPanelProps {
  contests: Contest[];
  studentId: StudentId;
  onComplete: (attempt: MockAttempt, contest: Contest) => void;
}

const choices: AnswerChoice[] = ["A", "B", "C", "D", "E"];

export function MockPanel({
  contests,
  studentId,
  onComplete,
}: MockPanelProps) {
  const [year, setYear] = useState(contests[0]?.year ?? 2025);
  const [answers, setAnswers] = useState<Partial<Record<number, AnswerChoice>>>({});
  const [secondsLeft, setSecondsLeft] = useState(40 * 60);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<number | null | undefined>(undefined);
  const contest = contests.find((item) => item.year === year) ?? contests[0];

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  const answered = Object.keys(answers).length;
  const timeLabel = useMemo(
    () =>
      `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(
        secondsLeft % 60,
      ).padStart(2, "0")}`,
    [secondsLeft],
  );

  if (!contest) return <p>No contest materials were imported.</p>;

  function reset(nextYear = year) {
    const nextContest = contests.find((item) => item.year === nextYear);
    setAnswers({});
    setResult(undefined);
    setRunning(false);
    setSecondsLeft((nextContest?.durationMinutes ?? 40) * 60);
  }

  function submit() {
    const score = scoreContest(contest, answers);
    setResult(score);
    setRunning(false);
    onComplete(
      {
        id: crypto.randomUUID(),
        studentId,
        year,
        answers,
        score,
        completedAt: new Date().toISOString(),
        durationSeconds: contest.durationMinutes * 60 - secondsLeft,
      },
      contest,
    );
  }

  return (
    <div className="space-y-6">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Past contest simulator</p>
          <h2>25 questions · 40 minutes</h2>
        </div>
        <p>
          Open the official-format PDF, record answers here, then submit for
          automatic scoring where a verified answer key is available.
        </p>
      </header>

      <section className="mock-toolbar">
        <label>
          Contest year
          <select
            value={year}
            onChange={(event) => {
              const nextYear = Number(event.target.value);
              setYear(nextYear);
              reset(nextYear);
            }}
          >
            {contests.map((item) => (
              <option key={item.year} value={item.year}>
                {item.year} {item.status === "practice-only" ? "(practice only)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="timer-box" aria-live="polite">
          <TimerReset size={19} />
          <strong>{timeLabel}</strong>
          <button onClick={() => setRunning((value) => !value)}>
            {running ? "Pause" : secondsLeft < 40 * 60 ? "Resume" : "Start"}
          </button>
        </div>
        <a className="secondary-button" href={contest.pdfUrl} target="_blank">
          <FileText size={17} /> Open PDF
        </a>
        <a
          className="secondary-button"
          href={contest.sourceUrl}
          rel="noreferrer"
          target="_blank"
        >
          Source <ExternalLink size={15} />
        </a>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <section className="pdf-frame">
          <iframe src={contest.pdfUrl} title={`${contest.year} AMC 8 PDF`} />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h3>Answer sheet</h3>
            <span className="status-pill">{answered}/25 answered</span>
          </div>
          <div className="answer-grid">
            {Array.from({ length: 25 }, (_, index) => index + 1).map((number) => (
              <fieldset key={number}>
                <legend>{number}</legend>
                <div>
                  {choices.map((choice) => (
                    <button
                      aria-label={`Question ${number}: ${choice}`}
                      className={answers[number] === choice ? "selected" : ""}
                      key={choice}
                      onClick={() =>
                        setAnswers((current) => ({ ...current, [number]: choice }))
                      }
                      type="button"
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="submit-row">
            <button className="secondary-button" onClick={() => reset()}>
              Reset
            </button>
            <button className="primary-button" onClick={submit}>
              Submit mock
            </button>
          </div>
          {result !== undefined && (
            <div className="result-card" role="status">
              {result === null ? (
                <p>
                  This year is available for timed practice, but its answer key
                  has not yet passed the import check.
                </p>
              ) : (
                <>
                  <strong>{result}/25</strong>
                  <span>{Math.round((result / 25) * 100)}% correct</span>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
