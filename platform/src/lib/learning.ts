import type {
  AnswerChoice,
  AppState,
  Contest,
  ErrorType,
  MattReadinessScore,
  MattTrainingConfig,
  ProblemSolvingTool,
  StudentState,
} from "@/lib/domain";
import { knowledgeTopics } from "@/data/knowledge";

export const mattTrainingConfig: MattTrainingConfig = {
  studentId: "matt",
  studentName: "Matt",
  targetExamDate: "2027-01-22",
  targetCorrectAnswers: 20,
  practiceTargetLow: 21,
  practiceTargetHigh: 22,
  totalQuestions: 25,
  targetAccuracy: 0.8,
  targetReadinessScore: 85,
};

export const emptyStudentState = (): StudentState => ({
  mastery: {},
  attempts: [],
  mistakes: [],
  practiceAttempts: [],
  solutionPapers: [],
  readinessHistory: [],
});

export const createInitialState = (): AppState => ({
  student: emptyStudentState(),
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

export function nextReviewDate(reviewCount: number, from = new Date()): string {
  const intervals = [1, 3, 7, 14, 30];
  const days = intervals[Math.min(reviewCount, intervals.length - 1)];
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

export function averageMastery(state: StudentState): number {
  const values = knowledgeTopics.map((topic) => state.mastery[topic.id] ?? 0);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function daysUntilExam(now = new Date()): number {
  const target = new Date(`${mattTrainingConfig.targetExamDate}T00:00:00`);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86_400_000));
}

export function toolMasteryScores(state: StudentState) {
  const tools = new Set<ProblemSolvingTool>();
  state.practiceAttempts.forEach((attempt) =>
    attempt.toolTags.forEach((tool) => tools.add(tool)),
  );

  return [...tools].map((tool) => {
    const attempts = state.practiceAttempts.filter((attempt) =>
      attempt.toolTags.includes(tool),
    );
    const correct = attempts.filter((attempt) => attempt.correct).length;
    const independence = attempts.length
      ? attempts.reduce(
          (sum, attempt) => sum + Math.max(0, 100 - attempt.hintLevelUsed * 18),
          0,
        ) / attempts.length
      : 0;
    return {
      tool,
      attemptedQuestions: attempts.length,
      correctQuestions: correct,
      masteryScore: Math.round(
        attempts.length ? (correct / attempts.length) * 70 + independence * 0.3 : 0,
      ),
    };
  });
}

function recentMockAccuracy(state: StudentState) {
  const scored = state.attempts.filter((attempt) => attempt.score !== null).slice(0, 5);
  if (!scored.length) return null;
  return (
    scored.reduce((sum, attempt) => sum + (attempt.score ?? 0) / 25, 0) /
    scored.length
  );
}

export function calculateReadiness(
  state: StudentState,
  now = new Date(),
): MattReadinessScore {
  const knowledgeMastery = averageMastery(state);
  const toolScores = toolMasteryScores(state);
  const toolMastery = toolScores.length
    ? Math.round(
        toolScores.reduce((sum, item) => sum + item.masteryScore, 0) /
          toolScores.length,
      )
    : 0;
  const mockAccuracy = recentMockAccuracy(state);
  const practiceAccuracy = state.practiceAttempts.length
    ? state.practiceAttempts.filter((attempt) => attempt.correct).length /
      state.practiceAttempts.length
    : null;
  const accuracy = Math.round(
    100 *
      (mockAccuracy !== null && practiceAccuracy !== null
        ? mockAccuracy * 0.7 + practiceAccuracy * 0.3
        : mockAccuracy ?? practiceAccuracy ?? 0),
  );
  const timedMocks = state.attempts.filter(
    (attempt) => attempt.score !== null && attempt.durationSeconds > 0,
  );
  const speed = timedMocks.length
    ? Math.round(
        timedMocks.reduce(
          (sum, attempt) =>
            sum +
            Math.min(
              100,
              ((attempt.score ?? 0) / 20) * 70 +
                Math.max(0, (2_400 - attempt.durationSeconds) / 24),
            ),
          0,
        ) / timedMocks.length,
      )
    : 0;
  const independence = state.practiceAttempts.length
    ? Math.round(
        state.practiceAttempts.reduce(
          (sum, attempt) => sum + Math.max(0, 100 - attempt.hintLevelUsed * 18),
          0,
        ) / state.practiceAttempts.length,
      )
    : 0;
  const reviewed = state.mistakes.filter((mistake) => mistake.reviewCount > 0).length;
  const reviewDiscipline = state.mistakes.length
    ? Math.round((reviewed / state.mistakes.length) * 100)
    : 0;
  const readinessScore = Math.round(
    knowledgeMastery * 0.25 +
      toolMastery * 0.25 +
      accuracy * 0.2 +
      speed * 0.15 +
      independence * 0.1 +
      reviewDiscipline * 0.05,
  );
  const predictedCenter = Math.min(25, readinessScore * (20 / 85));
  const low = Math.max(0, Math.floor(predictedCenter - 1));
  const high = Math.min(25, Math.ceil(predictedCenter + 1));

  return {
    readinessScore,
    predictedCorrectRange: { low, high },
    targetCorrectAnswers: 20,
    gapToTarget: Math.max(0, 20 - high),
    components: {
      knowledgeMastery,
      toolMastery,
      accuracy,
      speed,
      independence,
      reviewDiscipline,
    },
    updatedAt: now.toISOString(),
  };
}

export function errorDistribution(state: StudentState) {
  const counts = new Map<ErrorType, number>();
  state.mistakes.forEach((mistake) =>
    counts.set(mistake.errorType, (counts.get(mistake.errorType) ?? 0) + 1),
  );
  return [...counts.entries()]
    .map(([errorType, count]) => ({
      errorType,
      count,
      percentage: state.mistakes.length
        ? Math.round((count / state.mistakes.length) * 100)
        : 0,
    }))
    .sort((a, b) => b.count - a.count);
}
