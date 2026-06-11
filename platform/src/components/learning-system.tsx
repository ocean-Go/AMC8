"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  BookMarked,
  BrainCircuit,
  ClipboardCheck,
  Download,
  FilePenLine,
  GraduationCap,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { CoachPanel } from "@/components/coach-panel";
import { DashboardPanel } from "@/components/dashboard-panel";
import { KnowledgePanel } from "@/components/knowledge-panel";
import { MistakesPanel } from "@/components/mistakes-panel";
import { MockPanel } from "@/components/mock-panel";
import { OversightPanel } from "@/components/oversight-panel";
import { SolutionPaperPanel } from "@/components/solution-paper-panel";
import { ToolboxPanel } from "@/components/toolbox-panel";
import { useLearningState } from "@/hooks/use-learning-state";
import type {
  AnswerChoice,
  Contest,
  ErrorType,
  MockAttempt,
  PracticeAttempt,
  PracticeQuestion,
} from "@/lib/domain";
import {
  calculateReadiness,
  mattTrainingConfig,
  nextReviewDate,
} from "@/lib/learning";

const studentNav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "learn", label: "Knowledge", icon: GraduationCap },
  { id: "toolbox", label: "Toolbox", icon: Wrench },
  { id: "mock", label: "Mock tests", icon: ClipboardCheck },
  { id: "solution-paper", label: "AI solution paper", icon: FilePenLine },
  { id: "coach", label: "AI coach", icon: BrainCircuit },
  { id: "mistakes", label: "Mistake book", icon: BookMarked },
];

export function LearningSystem() {
  const { state, setState, loaded } = useLearningState();
  const [role, setRole] = useState<"matt" | "parent" | "admin">("matt");
  const [view, setView] = useState("dashboard");
  const [contests, setContests] = useState<Contest[]>([]);
  const student = state.student;

  useEffect(() => {
    void fetch("/content/contests.json")
      .then((response) => response.json())
      .then((data: Contest[]) => setContests(data));
  }, []);

  function updateStudent(updater: (current: typeof student) => typeof student) {
    setState((current) => {
      const next = updater(current.student);
      const readiness = calculateReadiness(next);
      return {
        ...current,
        student: {
          ...next,
          readinessHistory: [
            {
              readinessScore: readiness.readinessScore,
              predictedCorrectLow: readiness.predictedCorrectRange.low,
              predictedCorrectHigh: readiness.predictedCorrectRange.high,
              recordedAt: readiness.updatedAt,
            },
            ...next.readinessHistory,
          ].slice(0, 500),
        },
      };
    });
  }

  function setMastery(topicId: string, value: number) {
    updateStudent((current) => ({
      ...current,
      mastery: { ...current.mastery, [topicId]: Math.min(100, Math.max(0, value)) },
    }));
  }

  function addPracticeMistake(
    question: PracticeQuestion,
    selected: AnswerChoice,
    hintLevelUsed: number,
  ) {
    const errorType: ErrorType =
      hintLevelUsed >= 3 ? "strategy_gap" : "knowledge_gap";
    updateStudent((current) => ({
      ...current,
      mistakes: [
        {
          id: crypto.randomUUID(),
          studentId: "matt",
          source: "practice",
          questionRef: question.prompt,
          selected,
          correct: question.answer,
          topicId: question.topicId,
          createdAt: new Date().toISOString(),
          nextReviewAt: nextReviewDate(0),
          reviewCount: 0,
          errorType,
          toolTags: question.toolTags,
        },
        ...current.mistakes,
      ],
    }));
  }

  function completeMock(attempt: MockAttempt, contest: Contest) {
    updateStudent((current) => {
      const mistakes = contest.answers
        ? contest.answers.flatMap((correct, index) => {
            const selected = attempt.answers[index + 1];
            if (!selected || selected === correct) return [];
            return [
              {
                id: crypto.randomUUID(),
                studentId: "matt" as const,
                source: "mock" as const,
                questionRef: `${contest.year} AMC 8 - Question ${index + 1}`,
                selected,
                correct,
                createdAt: new Date().toISOString(),
                nextReviewAt: nextReviewDate(0),
                reviewCount: 0,
                errorType: "strategy_gap" as const,
                toolTags: [],
              },
            ];
          })
        : [];
      return {
        ...current,
        attempts: [attempt, ...current.attempts],
        mistakes: [...mistakes, ...current.mistakes],
      };
    });
  }

  function changeRole(nextRole: "matt" | "parent" | "admin") {
    setRole(nextRole);
    setView(
      nextRole === "parent" ? "parent" : nextRole === "admin" ? "admin" : "dashboard",
    );
  }

  function exportMattData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      config: mattTrainingConfig,
      student: state.student,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `matt-amc8-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!loaded) return <div className="loading-screen">Loading Matt&apos;s profile...</div>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">8</div>
          <div>
            <strong>Northstar AMC</strong>
            <span>Matt - Road to 20</span>
          </div>
        </div>

        {role === "matt" && (
          <nav aria-label="Student navigation">
            {studentNav.map(({ id, label, icon: Icon }) => (
              <button
                className={view === id ? "active" : ""}
                key={id}
                onClick={() => setView(id)}
              >
                <Icon size={18} /> {label}
              </button>
            ))}
          </nav>
        )}
        {role === "parent" && (
          <nav>
            <button className="active">
              <BarChart3 size={18} /> Matt progress
            </button>
          </nav>
        )}
        {role === "admin" && (
          <nav>
            <button className="active">
              <ShieldCheck size={18} /> Acceptance
            </button>
          </nav>
        )}

        <div className="role-switcher">
          <label htmlFor="role">Workspace</label>
          <select
            id="role"
            onChange={(event) =>
              changeRole(event.target.value as "matt" | "parent" | "admin")
            }
            value={role}
          >
            <option value="matt">Matt</option>
            <option value="parent">Parent</option>
            <option value="admin">Admin</option>
          </select>
          <button className="export-button" onClick={exportMattData} type="button">
            <Download size={14} /> Export backup
          </button>
          <p>Single-user training profile. Data is saved on this device.</p>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <div>
            <span className="eyebrow">2027 AMC 8 training system</span>
            <strong>
              {role === "matt"
                ? "Matt workspace"
                : role === "parent"
                  ? "Matt progress"
                  : "System acceptance"}
            </strong>
          </div>
          <div className="topbar-status">
            <Settings2 size={15} /> Target: 20/25 on Jan 22, 2027
          </div>
        </div>

        {view === "dashboard" && (
          <DashboardPanel student={student} onNavigate={setView} />
        )}
        {view === "learn" && (
          <KnowledgePanel student={student} onMasteryChange={setMastery} />
        )}
        {view === "toolbox" && <ToolboxPanel student={student} />}
        {view === "mock" && (
          <MockPanel contests={contests} studentId="matt" onComplete={completeMock} />
        )}
        {view === "solution-paper" && (
          <SolutionPaperPanel
            studentId="matt"
            records={student.solutionPapers}
            onSave={(record) =>
              updateStudent((current) => ({
                ...current,
                solutionPapers: [record, ...current.solutionPapers],
              }))
            }
          />
        )}
        {view === "coach" && (
          <CoachPanel
            onPracticeAttempt={(attempt: PracticeAttempt) =>
              updateStudent((current) => ({
                ...current,
                practiceAttempts: [attempt, ...current.practiceAttempts],
              }))
            }
            onIncorrect={addPracticeMistake}
            onMasteryGain={(topicId, gain) =>
              setMastery(topicId, (student.mastery[topicId] ?? 0) + gain)
            }
          />
        )}
        {view === "mistakes" && (
          <MistakesPanel
            mistakes={student.mistakes}
            onErrorTypeChange={(mistakeId, errorType) =>
              updateStudent((current) => ({
                ...current,
                mistakes: current.mistakes.map((mistake) =>
                  mistake.id === mistakeId ? { ...mistake, errorType } : mistake,
                ),
              }))
            }
            onReview={(mistakeId) =>
              updateStudent((current) => ({
                ...current,
                mistakes: current.mistakes.map((mistake) =>
                  mistake.id === mistakeId
                    ? {
                        ...mistake,
                        reviewCount: mistake.reviewCount + 1,
                        nextReviewAt: nextReviewDate(mistake.reviewCount + 1),
                      }
                    : mistake,
                ),
              }))
            }
          />
        )}
        {view === "parent" && (
          <OversightPanel admin={false} contests={contests} state={state} />
        )}
        {view === "admin" && (
          <OversightPanel admin contests={contests} state={state} />
        )}
      </main>
    </div>
  );
}
