export type StudentId = "matt";
export type AppRole = StudentId | "parent" | "admin";
export type AnswerChoice = "A" | "B" | "C" | "D" | "E";
export type ErrorType =
  | "calculation_error"
  | "misreading"
  | "knowledge_gap"
  | "strategy_gap"
  | "time_pressure"
  | "diagram_error"
  | "careless_error"
  | "guessing"
  | "incomplete_reasoning";
export type ProblemSolvingTool =
  | "parity"
  | "divisibility"
  | "modular_arithmetic"
  | "enumeration"
  | "casework"
  | "construction"
  | "contradiction"
  | "extreme_principle"
  | "pigeonhole"
  | "invariant"
  | "symmetry"
  | "recursion"
  | "coordinate_method"
  | "area_method"
  | "complement"
  | "inclusion_exclusion"
  | "working_backwards"
  | "pattern_recognition";
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
  toolTags: ProblemSolvingTool[];
  hintLadder: [string, string, string, string, string];
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
  errorType: ErrorType;
  toolTags: ProblemSolvingTool[];
}

export interface PracticeAttempt {
  id: string;
  questionId: string;
  correct: boolean;
  selected: AnswerChoice;
  hintLevelUsed: number;
  toolTags: ProblemSolvingTool[];
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
  practiceAttempts: PracticeAttempt[];
  solutionPapers: SolutionPaperRecord[];
  readinessHistory: ReadinessHistoryEntry[];
}

export interface AppState {
  student: StudentState;
}

export interface MattTrainingConfig {
  studentId: "matt";
  studentName: "Matt";
  targetExamDate: "2027-01-22";
  targetCorrectAnswers: 20;
  practiceTargetLow: 21;
  practiceTargetHigh: 22;
  totalQuestions: 25;
  targetAccuracy: 0.8;
  targetReadinessScore: 85;
}

export interface MattReadinessScore {
  readinessScore: number;
  predictedCorrectRange: { low: number; high: number };
  targetCorrectAnswers: 20;
  gapToTarget: number;
  components: {
    knowledgeMastery: number;
    toolMastery: number;
    accuracy: number;
    speed: number;
    independence: number;
    reviewDiscipline: number;
  };
  updatedAt: string;
}

export interface ReadinessHistoryEntry {
  readinessScore: number;
  predictedCorrectLow: number;
  predictedCorrectHigh: number;
  recordedAt: string;
}
