import type {
  AnswerChoice,
  AppState,
  Contest,
  StudentId,
  StudentState,
} from "@/lib/domain";

export const emptyStudentState = (): StudentState => ({
  mastery: {},
  attempts: [],
  mistakes: [],
  experimentEvents: [],
});

export const createInitialState = (): AppState => ({
  students: {
    matt: emptyStudentState(),
    chris: emptyStudentState(),
  },
});

export function scoreContest(
  contest: Contest,
  answers: Partial<Record<number, AnswerChoice>>,
): number | null {
  if (!contest.answers) return null;
  return contest.answers.reduce(
    (score, answer, index) => score + (answers[index + 1] === answer ? 1 : 0),
    0,
  );
}

export function getExperimentVariant(
  studentId: StudentId,
  date = new Date(),
): "A" | "B" {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.floor((date.getTime() - start) / (7 * 24 * 60 * 60 * 1000));
  const mattGetsA = week % 2 === 0;
  return studentId === "matt" === mattGetsA ? "A" : "B";
}

export function nextReviewDate(reviewCount: number, from = new Date()): string {
  const intervals = [1, 3, 7, 14, 30];
  const days = intervals[Math.min(reviewCount, intervals.length - 1)];
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

export function averageMastery(state: StudentState): number {
  const values = Object.values(state.mastery);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
