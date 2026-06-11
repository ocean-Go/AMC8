export type StudentId = "matt" | "chris";
export type AppRole = StudentId | "parent" | "admin";
export type AnswerChoice = "A" | "B" | "C" | "D" | "E";
export type KnowledgeDomain =
  | "Arithmetic"
  | "Number Theory"
  | "Algebra"
  | "Geometry"
  | "Counting & Probability"
  | "Statistics & Logic";

export interface Contest {
  year: number;
  questionCount: number;
  durationMinutes: number;
  pdfUrl: string;
  answers: AnswerChoice[] | null;
  sourceUrl: string;
  status: "scored" | "practice-only";
}

export interface KnowledgeTopic {
  id: string;
  domain: KnowledgeDomain;
  title: string;
  description: string;
}

export interface PracticeQuestion {
  id: string;
  domain: KnowledgeDomain;
  topicId: string;
  prompt: string;
  choices: Record<AnswerChoice, string>;
  answer: AnswerChoice;
  hint: string;
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface MockAttempt {
  id: string;
  studentId: StudentId;
  year: number;
  answers: Partial<Record<number, AnswerChoice>>;
  score: number | null;
  completedAt: string;
  durationSeconds: number;
}

export interface Mistake {
  id: string;
  studentId: StudentId;
  source: "mock" | "practice";
  questionRef: string;
  selected: AnswerChoice;
  correct: AnswerChoice;
  topicId?: string;
  createdAt: string;
  nextReviewAt: string;
  reviewCount: number;
}

export interface ExperimentEvent {
  id: string;
  studentId: StudentId;
  variant: "A" | "B";
  name: "session_started" | "hint_used" | "answer_submitted" | "session_completed";
  correct?: boolean;
  createdAt: string;
}

export interface StudentState {
  mastery: Record<string, number>;
  attempts: MockAttempt[];
  mistakes: Mistake[];
  experimentEvents: ExperimentEvent[];
}

export interface AppState {
  students: Record<StudentId, StudentState>;
}
