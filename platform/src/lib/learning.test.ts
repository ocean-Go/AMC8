import { describe, expect, it } from "vitest";
import type { Contest } from "@/lib/domain";
import { knowledgeTopics } from "@/data/knowledge";
import {
  averageMastery,
  calculateReadiness,
  emptyStudentState,
  nextReviewDate,
  scoreContest,
} from "@/lib/learning";

const contest: Contest = {
  year: 2024,
  questionCount: 25,
  durationMinutes: 40,
  pdfUrl: "/test.pdf",
  sourceUrl: "https://example.com",
  status: "scored",
  answers: ["A", "B", "C", "D", "E"],
};

describe("contest scoring", () => {
  it("counts only exact answer matches", () => {
    expect(scoreContest(contest, { 1: "A", 2: "C", 3: "C", 5: "E" })).toBe(3);
  });

  it("does not score an unverified contest", () => {
    expect(scoreContest({ ...contest, answers: null }, { 1: "A" })).toBeNull();
  });
});

describe("learning schedule", () => {
  it("uses the 1, 3, 7, 14, 30 day review ladder", () => {
    const start = new Date("2026-06-11T12:00:00.000Z");
    expect(nextReviewDate(0, start)).toBe("2026-06-12T12:00:00.000Z");
    expect(nextReviewDate(2, start)).toBe("2026-06-18T12:00:00.000Z");
    expect(nextReviewDate(9, start)).toBe("2026-07-11T12:00:00.000Z");
  });

  it("averages recorded topic mastery", () => {
    const state = emptyStudentState();
    state.mastery = { ratios: 80, circles: 40 };
    expect(averageMastery(state)).toBe(5);
  });
});

describe("Matt readiness", () => {
  it("combines knowledge, tools, accuracy, speed, independence, and review", () => {
    const state = emptyStudentState();
    state.mastery = Object.fromEntries(
      knowledgeTopics.map((topic) => [topic.id, 80]),
    );
    state.practiceAttempts = [
      {
        id: "practice-1",
        questionId: "counting-01",
        correct: true,
        selected: "C",
        hintLevelUsed: 0,
        toolTags: ["enumeration"],
        createdAt: "2026-06-11T12:00:00.000Z",
      },
    ];

    const result = calculateReadiness(
      state,
      new Date("2026-06-11T12:00:00.000Z"),
    );
    expect(result.readinessScore).toBe(75);
    expect(result.components.knowledgeMastery).toBe(80);
    expect(result.components.toolMastery).toBe(100);
    expect(result.predictedCorrectRange).toEqual({ low: 16, high: 19 });
    expect(result.gapToTarget).toBe(1);
  });
});
