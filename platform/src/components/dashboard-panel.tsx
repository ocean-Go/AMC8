"use client";

import { BookOpenCheck, BrainCircuit, Clock3, Target } from "lucide-react";
import { knowledgeTopics } from "@/data/knowledge";
import type { StudentId, StudentState } from "@/lib/domain";
import { averageMastery, getExperimentVariant } from "@/lib/learning";

interface DashboardPanelProps {
  studentId: StudentId;
  student: StudentState;
  onNavigate: (view: string) => void;
}

export function DashboardPanel({
  studentId,
  student,
  onNavigate,
}: DashboardPanelProps) {
  const mastery = averageMastery(student);
  const due = student.mistakes.filter(
    (mistake) => new Date(mistake.nextReviewAt) <= new Date(),
  ).length;
  const variant = getExperimentVariant(studentId);
  const completedTopics = knowledgeTopics.filter(
    (topic) => (student.mastery[topic.id] ?? 0) >= 80,
  ).length;

  const metrics = [
    { label: "Knowledge mastery", value: `${mastery}%`, icon: BrainCircuit },
    { label: "Topics mastered", value: `${completedTopics}/25`, icon: Target },
    { label: "Mock attempts", value: String(student.attempts.length), icon: Clock3 },
    { label: "Reviews due", value: String(due), icon: BookOpenCheck },
  ];

  return (
    <div className="space-y-6">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Today&apos;s mission</p>
          <h2>Build one strong idea, then test it under time.</h2>
          <p>
            Complete a focused lesson, solve one coached problem, and finish a
            10-minute true-contest sprint.
          </p>
        </div>
        <button className="primary-button" onClick={() => onNavigate("learn")}>
          Start learning
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

      <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Learning path</p>
              <h3>Six-domain coverage</h3>
            </div>
            <span className="status-pill">{mastery}% overall</span>
          </div>
          <div className="coverage-bar" aria-label={`${mastery}% mastered`}>
            <span style={{ width: `${mastery}%` }} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "Arithmetic",
              "Number Theory",
              "Algebra",
              "Geometry",
              "Counting & Probability",
              "Statistics & Logic",
            ].map((domain) => {
              const topics = knowledgeTopics.filter((topic) => topic.domain === domain);
              const value = Math.round(
                topics.reduce(
                  (sum, topic) => sum + (student.mastery[topic.id] ?? 0),
                  0,
                ) / topics.length,
              );
              return (
                <div className="domain-row" key={domain}>
                  <span>{domain}</span>
                  <strong>{value}%</strong>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel experiment-card">
          <p className="eyebrow">A/B crossover</p>
          <h3>Current coaching mode: {variant}</h3>
          <p>
            {variant === "A"
              ? "Hints first: the coach reveals one small step at a time."
              : "Worked example first: the coach shows a parallel example before your problem."}
          </p>
          <div className="experiment-note">
            Matt and Chris switch modes weekly. Completion, accuracy, time, and
            hint use are compared within each student.
          </div>
        </article>
      </section>
    </div>
  );
}
