"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  BookMarked,
  BrainCircuit,
  ClipboardCheck,
  FilePenLine,
  GraduationCap,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { CoachPanel } from "@/components/coach-panel";
import { DashboardPanel } from "@/components/dashboard-panel";
import { KnowledgePanel } from "@/components/knowledge-panel";
import { MistakesPanel } from "@/components/mistakes-panel";
import { MockPanel } from "@/components/mock-panel";
import { OversightPanel } from "@/components/oversight-panel";
import { SolutionPaperPanel } from "@/components/solution-paper-panel";
import { useLearningState } from "@/hooks/use-learning-state";
import type {
  AnswerChoice,
  AppRole,
  Contest,
  ExperimentEvent,
  MockAttempt,
  PracticeQuestion,
  StudentId,
} from "@/lib/domain";
import { nextReviewDate } from "@/lib/learning";

const studentNav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "learn", label: "Knowledge", icon: GraduationCap },
  { id: "mock", label: "Mock tests", icon: ClipboardCheck },
  { id: "solution-paper", label: "AI solution paper", icon: FilePenLine },
  { id: "coach", label: "AI coach", icon: BrainCircuit },
  { id: "mistakes", label: "Mistake book", icon: BookMarked },
];

export function LearningSystem() {
  const { state, setState, loaded } = useLearningState();
  const [role, setRole] = useState<AppRole>("matt");
  const [view, setView] = useState("dashboard");
  const [contests, setContests] = useState<Contest[]>([]);
  const studentId: StudentId = role === "chris" ? "chris" : "matt";
  const student = state.students[studentId];

  useEffect(() => {
    void fetch("/content/contests.json")
      .then((response) => response.json())
      .then((data: Contest[]) => setContests(data));
  }, []);

  function updateStudent(updater: (current: typeof student) => typeof student) {
    setState((current) => ({
      ...current,
      students: {
        ...current.students,
        [studentId]: updater(current.students[studentId]),
      },
    }));
  }

  function setMastery(topicId: string, value: number) {
    updateStudent((current) => ({
      ...current,
      mastery: { ...current.mastery, [topicId]: Math.min(100, Math.max(0, value)) },
    }));
  }

  function addPracticeMistake(question: PracticeQuestion, selected: AnswerChoice) {
    updateStudent((current) => ({
      ...current,
      mistakes: [{
        id: crypto.randomUUID(),
        studentId,
        source: "practice",
        questionRef: question.prompt,
        selected,
        correct: question.answer,
        topicId: question.topicId,
        createdAt: new Date().toISOString(),
        nextReviewAt: nextReviewDate(0),
        reviewCount: 0,
      }, ...current.mistakes],
    }));
  }

  function completeMock(attempt: MockAttempt, contest: Contest) {
    updateStudent((current) => {
      const mistakes = contest.answers
        ? contest.answers.flatMap((correct, index) => {
            const selected = attempt.answers[index + 1];
            if (!selected || selected === correct) return [];
            return [{
              id: crypto.randomUUID(),
              studentId,
              source: "mock" as const,
              questionRef: `${contest.year} AMC 8 · Question ${index + 1}`,
              selected,
              correct,
              createdAt: new Date().toISOString(),
              nextReviewAt: nextReviewDate(0),
              reviewCount: 0,
            }];
          })
        : [];
      return {
        ...current,
        attempts: [attempt, ...current.attempts],
        mistakes: [...mistakes, ...current.mistakes],
      };
    });
  }

  function changeRole(nextRole: AppRole) {
    setRole(nextRole);
    setView(nextRole === "parent" ? "parent" : nextRole === "admin" ? "admin" : "dashboard");
  }

  if (!loaded) return <div className="loading-screen">Loading learning profile...</div>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">8</div>
          <div><strong>Northstar AMC</strong><span>Matt & Chris</span></div>
        </div>

        {(role === "matt" || role === "chris") && (
          <nav aria-label="Student navigation">
            {studentNav.map(({ id, label, icon: Icon }) => (
              <button className={view === id ? "active" : ""} key={id} onClick={() => setView(id)}>
                <Icon size={18} /> {label}
              </button>
            ))}
          </nav>
        )}
        {role === "parent" && (
          <nav><button className="active"><BarChart3 size={18} /> Parent overview</button></nav>
        )}
        {role === "admin" && (
          <nav><button className="active"><ShieldCheck size={18} /> Acceptance</button></nav>
        )}

        <div className="role-switcher">
          <label htmlFor="role">Viewing as</label>
          <select id="role" onChange={(event) => changeRole(event.target.value as AppRole)} value={role}>
            <option value="matt">Matt</option>
            <option value="chris">Chris</option>
            <option value="parent">Parent</option>
            <option value="admin">Admin</option>
          </select>
          <p>Local family profiles. No account setup required.</p>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <div>
            <span className="eyebrow">AMC 8 learning system</span>
            <strong className="capitalize">{role} workspace</strong>
          </div>
          <div className="topbar-status"><Settings2 size={15} /> Data saved on this device</div>
        </div>

        {view === "dashboard" && <DashboardPanel student={student} studentId={studentId} onNavigate={setView} />}
        {view === "learn" && <KnowledgePanel student={student} onMasteryChange={setMastery} />}
        {view === "mock" && <MockPanel contests={contests} studentId={studentId} onComplete={completeMock} />}
        {view === "solution-paper" && (
          <SolutionPaperPanel
            studentId={studentId}
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
            studentId={studentId}
            onEvent={(event: ExperimentEvent) =>
              updateStudent((current) => ({
                ...current,
                experimentEvents: [...current.experimentEvents, event],
              }))
            }
            onIncorrect={addPracticeMistake}
            onMasteryGain={(topicId, gain) => setMastery(topicId, (student.mastery[topicId] ?? 0) + gain)}
          />
        )}
        {view === "mistakes" && (
          <MistakesPanel
            mistakes={student.mistakes}
            onReview={(mistakeId) =>
              updateStudent((current) => ({
                ...current,
                mistakes: current.mistakes.map((mistake) =>
                  mistake.id === mistakeId
                    ? { ...mistake, reviewCount: mistake.reviewCount + 1, nextReviewAt: nextReviewDate(mistake.reviewCount + 1) }
                    : mistake,
                ),
              }))
            }
          />
        )}
        {view === "parent" && <OversightPanel admin={false} contests={contests} state={state} />}
        {view === "admin" && <OversightPanel admin contests={contests} state={state} />}
      </main>
    </div>
  );
}
