"use client";

import type { AppState, Contest } from "@/lib/domain";
import {
  calculateReadiness,
  errorDistribution,
  mattTrainingConfig,
  toolMasteryScores,
} from "@/lib/learning";

interface OversightPanelProps {
  state: AppState;
  contests: Contest[];
  admin: boolean;
}

export function OversightPanel({ state, contests, admin }: OversightPanelProps) {
  const student = state.student;
  const readiness = calculateReadiness(student);
  const hasBaseline =
    student.attempts.some((attempt) => attempt.score !== null) ||
    student.practiceAttempts.length >= 5 ||
    Object.values(student.mastery).some((value) => value > 0);
  const errors = errorDistribution(student);
  const weakTools = toolMasteryScores(student)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 3);
  const recentMocks = student.attempts
    .filter((attempt) => attempt.score !== null)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="page-heading">
        <div>
          <p className="eyebrow">
            {admin ? "System acceptance" : "Matt progress view"}
          </p>
          <h2>
            {admin ? "Content and system health" : "Is Matt on track for 20?"}
          </h2>
        </div>
        <p>
          {admin
            ? "Verify source coverage, scoring readiness, and Matt's local training data."
            : "A parent view of predicted score, target gap, recent mocks, weak tools, and error patterns."}
        </p>
      </header>

      <section className="parent-summary-grid">
        <article className="metric-card">
          <strong>{readiness.readinessScore}/100</strong>
          <span>Readiness score</span>
        </article>
        <article className="metric-card">
          <strong>
            {hasBaseline
              ? `${readiness.predictedCorrectRange.low}-${readiness.predictedCorrectRange.high}`
              : "—"}
          </strong>
          <span>Predicted correct</span>
        </article>
        <article className="metric-card">
          <strong>{hasBaseline ? readiness.gapToTarget : "—"}</strong>
          <span>Gap to 20</span>
        </article>
        <article className="metric-card">
          <strong>{student.solutionPapers.length}</strong>
          <span>Solution papers</span>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="panel">
          <p className="eyebrow">Recent full mocks</p>
          <h3>Stability toward 20</h3>
          <div className="report-list">
            {recentMocks.length ? (
              recentMocks.map((attempt) => (
                <div key={attempt.id}>
                  <span>{new Date(attempt.completedAt).toLocaleDateString()}</span>
                  <strong>{attempt.score}/25</strong>
                </div>
              ))
            ) : (
              <p>No scored mocks yet.</p>
            )}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Weak problem-solving tools</p>
          <h3>What to train next</h3>
          <div className="report-list">
            {weakTools.length ? (
              weakTools.map((item) => (
                <div key={item.tool}>
                  <span>{item.tool.replaceAll("_", " ")}</span>
                  <strong>{item.masteryScore}%</strong>
                </div>
              ))
            ) : (
              <p>Complete coached practice to create tool data.</p>
            )}
          </div>
        </article>
        <article className="panel">
          <p className="eyebrow">Error distribution</p>
          <h3>Why points are being lost</h3>
          <div className="report-list">
            {errors.length ? (
              errors.slice(0, 4).map((item) => (
                <div key={item.errorType}>
                  <span>{item.errorType.replaceAll("_", " ")}</span>
                  <strong>{item.percentage}%</strong>
                </div>
              ))
            ) : (
              <p>No diagnosed mistakes yet.</p>
            )}
          </div>
        </article>
      </section>

      {!admin && (
        <section className="panel parent-advice">
          <p className="eyebrow">Next week recommendation</p>
          <h3>
            Build reliable methods before pushing harder questions.
          </h3>
          <p>
            Aim for one full mock, two coached practice sessions, and review every
            due mistake. The internal practice target remains{" "}
            {mattTrainingConfig.practiceTargetLow}-
            {mattTrainingConfig.practiceTargetHigh}/25 to protect the official
            20/25 goal.
          </p>
        </section>
      )}

      {admin && (
        <section className="panel">
          <div className="panel-heading">
            <h3>Dataset acceptance</h3>
            <span className="status-pill">Matt single-user mode</span>
          </div>
          <div className="acceptance-grid">
            <div><strong>{contests.length}</strong><span>contest PDFs</span></div>
            <div><strong>{contests.filter((item) => item.answers).length}</strong><span>verified keys</span></div>
            <div><strong>25</strong><span>knowledge topics</span></div>
            <div><strong>1</strong><span>active student</span></div>
          </div>
        </section>
      )}
    </div>
  );
}
