"use client";

import { useEffect, useState } from "react";
import type { AppState } from "@/lib/domain";
import { createInitialState } from "@/lib/learning";

const storageKey = "amc8-learning-state-v1";

export function useLearningState() {
  const [state, setState] = useState<AppState>(createInitialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const timer = window.setTimeout(() => {
      if (saved) {
        try {
          setState(JSON.parse(saved) as AppState);
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
