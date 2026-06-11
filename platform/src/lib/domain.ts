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

export interface StrokePoint {
  x: number;
  y: number;
  t: number;
}

export interface SolutionStroke {
  id: string;
  tool: "pen" | "eraser";
  color: string;
  width: number;
  startedAt: number;
  endedAt: number;
  points: StrokePoint[];
}

export interface SolutionProcessMetrics {
  durationSeconds: number;
  activeSeconds: number;
  strokeCount: number;
  eraserStrokeCount: number;
  undoCount: number;
  pauseCount: number;
  longestPauseSeconds: number;
}

export interface SolutionAnalysis {
  source: "minimax" | "local";
  summary: string;
  approach: string[];
  strengths: string[];
  unclearPoints: string[];
  errors: string[];
  suggestions: string[];
  notableIdea: string | null;
}

export interface SolutionPaperRecord {
  id: string;
  studentId: StudentId;
  questionId: string;
  questionPrompt: string;
  createdAt: string;
  metrics: SolutionProcessMetrics;
  strokes: SolutionStroke[];
  analysis: SolutionAnalysis;
}

export interface StudentState {
  mastery: Record<string, number>;
  attempts: MockAttempt[];
  mistakes: Mistake[];
  experimentEvents: ExperimentEvent[];
  solutionPapers: SolutionPaperRecord[];
}

export interface AppState {
  students: Record<StudentId, StudentState>;
}
