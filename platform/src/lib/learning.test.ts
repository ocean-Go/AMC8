import { describe, expect, it } from "vitest";
import type { Contest } from "@/lib/domain";
import {
  averageMastery,
  emptyStudentState,
  getExperimentVariant,
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
    expect(averageMastery(state)).toBe(60);
  });
});

describe("A/B crossover", () => {
  it("assigns opposite variants to Matt and Chris", () => {
    const date = new Date("2026-06-11T12:00:00.000Z");
    expect(getExperimentVariant("matt", date)).not.toBe(
      getExperimentVariant("chris", date),
    );
  });

  it("flips each student's variant on the following week", () => {
    const weekOne = new Date("2026-06-11T12:00:00.000Z");
    const weekTwo = new Date("2026-06-18T12:00:00.000Z");
    expect(getExperimentVariant("matt", weekOne)).not.toBe(
      getExperimentVariant("matt", weekTwo),
    );
  });
});
