"use client";

import {
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  Gauge,
  Target,
  TrendingUp,
} from "lucide-react";
import { knowledgeTopics } from "@/data/knowledge";
import type { StudentState } from "@/lib/domain";
import {
  calculateReadiness,
  daysUntilExam,
  errorDistribution,
  mattTrainingConfig,
  toolMasteryScores,
} from "@/lib/learning";

interface DashboardPanelProps {
  student: StudentState;
  onNavigate: (view: string) => void;
}

const componentLabels = {
  knowledgeMastery: "Knowledge",
  toolMastery: "Toolbox",
  accuracy: "Accuracy",
  speed: "Speed",
  independence: "Independence",
  reviewDiscipline: "Review",
};

export function DashboardPanel({ student, onNavigate }: DashboardPanelProps) {
  const readiness = calculateReadiness(student);
  const hasBaseline =
    student.attempts.some((attempt) => attempt.score !== null) ||
    student.practiceAttempts.length >= 5 ||
    Object.values(student.mastery).some((value) => value > 0);
  const days = daysUntilExam();
  const due = student.mistakes.filter(
    (mistake) => new Date(mistake.nextReviewAt) <= new Date(),
  ).length;
  const weakestTopic = [...knowledgeTopics].sort(
    (a, b) => (student.mastery[a.id] ?? 0) - (student.mastery[b.id] ?? 0),
  )[0];
  const weakestTool = toolMasteryScores(student).sort(
    (a, b) => a.masteryScore - b.masteryScore,
  )[0];
  const mainError = errorDistribution(student)[0];
  const focus =
    !hasBaseline
      ? "Complete a baseline mock"
      : due > 0
      ? `Review ${due} due mistake${due === 1 ? "" : "s"}`
      : weakestTool
        ? `Train ${weakestTool.tool.replaceAll("_", " ")}`
        : `Build ${weakestTopic.title}`;

  const metrics = [
    {
      label: "Readiness score",
      value: `${readiness.readinessScore}/100`,
      icon: Gauge,
    },
    {
      label: "Predicted correct",
      value: hasBaseline
        ? `${readiness.predictedCorrectRange.low}-${readiness.predictedCorrectRange.high}`
        : "—",
      icon: TrendingUp,
    },
    {
      label: "Gap to 20",
      value: hasBaseline ? String(readiness.gapToTarget) : "—",
      icon: Target,
    },
    { label: "Days to exam", value: String(days), icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <section className="hero-card target-hero">
        <div>
          <p className="eyebrow">Matt&apos;s 2027 AMC 8 mission</p>
          <h2>Reach 20 correct answers by January 22, 2027.</h2>
          <p>
            Practice target: {mattTrainingConfig.practiceTargetLow}-
            {mattTrainingConfig.practiceTargetHigh}/25. Today&apos;s best next move:
            {" "}<strong>{focus}</strong>.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() =>
            onNavigate(!hasBaseline ? "mock" : due > 0 ? "mistakes" : "coach")
          }
        >
          Start today&apos;s training
        </button>
      </section>

      <section className="metric-grid">
        {metrics.map(({ label, value, icon: Icon }) => (
          <article className="metric-card" key={label}>
            <Icon aria-hidden="true" size={20} />
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <section className="readiness-layout">
        <article className="panel readiness-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">AMC 8 readiness</p>
              <h3>What is holding back the next correct answer?</h3>
            </div>
            <span className="status-pill">
              Target {mattTrainingConfig.targetReadinessScore}
            </span>
          </div>
          <div className="readiness-score-row">
            <div
              className="readiness-ring"
              style={{
                background: `conic-gradient(#e7ae43 ${readiness.readinessScore}%, #e5ebe6 0)`,
              }}
            >
              <span>{readiness.readinessScore}</span>
            </div>
            <div>
              <strong>
                {hasBaseline
                  ? `Expected ${readiness.predictedCorrectRange.low}-${readiness.predictedCorrectRange.high} correct`
                  : "Baseline needed before score prediction"}
              </strong>
              <p>
                {!hasBaseline
                  ? "Complete one scored full mock or several coached problems to establish Matt's starting point."
                  : readiness.gapToTarget
                  ? `${readiness.gapToTarget} more reliable question${readiness.gapToTarget === 1 ? "" : "s"} needed to reach 20.`
                  : "The current estimate reaches the 20-question target."}
              </p>
            </div>
          </div>
          <div className="readiness-components">
            {Object.entries(readiness.components).map(([key, value]) => (
              <div key={key}>
                <span>
                  {componentLabels[key as keyof typeof componentLabels]}
                  <strong>{value}%</strong>
                </span>
                <div><i style={{ width: `${value}%` }} /></div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel daily-focus-card">
          <p className="eyebrow">Today&apos;s diagnosis</p>
          <h3>{focus}</h3>
          <div className="focus-list">
            <div>
              <BrainCircuit size={17} />
              <span>
                Weak knowledge
                <strong>{weakestTopic.title}</strong>
              </span>
            </div>
            <div>
              <Target size={17} />
              <span>
                Weak tool
                <strong>
                  {weakestTool
                    ? weakestTool.tool.replaceAll("_", " ")
                    : "Not enough tool data"}
                </strong>
              </span>
            </div>
            <div>
              <BookOpenCheck size={17} />
              <span>
                Main error pattern
                <strong>
                  {mainError
                    ? `${mainError.errorType.replaceAll("_", " ")} (${mainError.percentage}%)`
                    : "Complete practice to diagnose"}
                </strong>
              </span>
            </div>
          </div>
          <button className="secondary-button" onClick={() => onNavigate("toolbox")}>
            Open problem-solving toolbox
          </button>
        </article>
      </section>
    </div>
  );
}
