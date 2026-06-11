"use client";

import type { AppState, Contest } from "@/lib/domain";
import { averageMastery } from "@/lib/learning";

interface OversightPanelProps {
  state: AppState;
  contests: Contest[];
  admin: boolean;
}

export function OversightPanel({ state, contests, admin }: OversightPanelProps) {
  const students = ["matt", "chris"] as const;

  return (
    <div className="space-y-6">
      <header className="page-heading">
        <div>
          <p className="eyebrow">{admin ? "System acceptance" : "Parent overview"}</p>
          <h2>{admin ? "Content and experiment health" : "Matt & Chris"}</h2>
        </div>
        <p>
          {admin
            ? "Verify source coverage, scoring readiness, learning activity, and A/B telemetry."
            : "A concise view of mastery, mock work, and review obligations."}
        </p>
      </header>

      <section className="student-comparison">
        {students.map((studentId) => {
          const student = state.students[studentId];
          const answers = student.experimentEvents.filter(
            (event) => event.name === "answer_submitted",
          );
          const correct = answers.filter((event) => event.correct).length;
          return (
            <article className="panel" key={studentId}>
              <p className="eyebrow">Student</p>
              <h3 className="capitalize">{studentId}</h3>
              <div className="comparison-metrics">
                <div><strong>{averageMastery(student)}%</strong><span>mastery</span></div>
                <div><strong>{student.attempts.length}</strong><span>mocks</span></div>
                <div><strong>{student.mistakes.length}</strong><span>mistakes</span></div>
                <div><strong>{answers.length ? Math.round((correct / answers.length) * 100) : 0}%</strong><span>practice accuracy</span></div>
              </div>
            </article>
          );
        })}
      </section>

      {admin && (
        <section className="panel">
          <div className="panel-heading">
            <h3>Dataset acceptance</h3>
            <span className="status-pill">Phase 1 imported</span>
          </div>
          <div className="acceptance-grid">
            <div><strong>{contests.length}</strong><span>contest PDFs</span></div>
            <div><strong>{contests.filter((item) => item.answers).length}</strong><span>verified answer keys</span></div>
            <div><strong>25</strong><span>knowledge topics</span></div>
            <div><strong>2</strong><span>crossover variants</span></div>
          </div>
          <div className="quality-note">
            OCR question text remains quarantined from automatic scoring because
            equations and diagrams contain extraction errors. PDFs are the
            authoritative question source; answer keys are parsed separately.
          </div>
        </section>
      )}
    </div>
  );
}
