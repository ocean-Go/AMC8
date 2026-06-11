"use client";

import { useEffect, useState } from "react";
import type { AppState } from "@/lib/domain";
import { createInitialState } from "@/lib/learning";

const storageKey = "amc8-learning-state-v1";

function normalizeState(saved: AppState): AppState {
  const initial = createInitialState();
  return {
    students: {
      matt: {
        ...initial.students.matt,
        ...saved.students?.matt,
        solutionPapers: saved.students?.matt?.solutionPapers ?? [],
      },
      chris: {
        ...initial.students.chris,
        ...saved.students?.chris,
        solutionPapers: saved.students?.chris?.solutionPapers ?? [],
      },
    },
  };
}

export function useLearningState() {
  const [state, setState] = useState<AppState>(createInitialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const timer = window.setTimeout(() => {
      if (saved) {
        try {
          setState(normalizeState(JSON.parse(saved) as AppState));
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
