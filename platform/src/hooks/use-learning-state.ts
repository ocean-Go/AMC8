"use client";

import { useEffect, useState } from "react";
import type { AppState, StudentState } from "@/lib/domain";
import { createInitialState } from "@/lib/learning";

const storageKey = "amc8-learning-state-v1";

type LegacyState = {
  students?: {
    matt?: Partial<StudentState>;
  };
};

function normalizeStudent(student?: Partial<StudentState>): StudentState {
  const initial = createInitialState().student;
  return {
    ...initial,
    ...student,
    practiceAttempts: student?.practiceAttempts ?? [],
    mistakes: (student?.mistakes ?? []).map((mistake) => ({
      ...mistake,
      errorType: mistake.errorType ?? "knowledge_gap",
      toolTags: mistake.toolTags ?? [],
    })),
    solutionPapers: student?.solutionPapers ?? [],
    readinessHistory: student?.readinessHistory ?? [],
  };
}

function normalizeState(saved: AppState | LegacyState): AppState {
  const student =
    "student" in saved ? saved.student : saved.students?.matt;
  return { student: normalizeStudent(student) };
}

export function useLearningState() {
  const [state, setState] = useState<AppState>(createInitialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const timer = window.setTimeout(() => {
      if (saved) {
        try {
          setState(normalizeState(JSON.parse(saved) as AppState | LegacyState));
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [loaded, state]);

  return { state, setState, loaded };
}
