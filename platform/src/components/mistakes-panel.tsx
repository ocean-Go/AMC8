"use client";

import { Check, RotateCcw } from "lucide-react";
import type { ErrorType, Mistake } from "@/lib/domain";

interface MistakesPanelProps {
  mistakes: Mistake[];
  onReview: (mistakeId: string) => void;
  onErrorTypeChange: (mistakeId: string, errorType: ErrorType) => void;
}

const errorTypes: ErrorType[] = [
  "calculation_error",
  "misreading",
  "knowledge_gap",
  "strategy_gap",
  "time_pressure",
  "diagram_error",
  "careless_error",
  "guessing",
  "incomplete_reasoning",
];

export function MistakesPanel({
  mistakes,
  onReview,
  onErrorTypeChange,
}: MistakesPanelProps) {
  return (
    <div className="space-y-6">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Spaced review</p>
          <h2>Mistake notebook</h2>
        </div>
        <p>
          Incorrect answers return after 1, 3, 7, 14, and 30 days. Completing a
          review advances the item to its next interval.
        </p>
      </header>
      <section className="panel">
        {mistakes.length === 0 ? (
          <div className="empty-state">
            <Check size={30} />
            <h3>No mistakes recorded yet</h3>
            <p>Complete a scored mock or practice problem to build this queue.</p>
          </div>
        ) : (
          <div className="mistake-list">
            {mistakes.map((mistake) => {
              const due = new Date(mistake.nextReviewAt) <= new Date();
              return (
                <article key={mistake.id}>
                  <div>
                    <span className={due ? "due-pill" : "status-pill"}>
                      {due
                        ? "Due now"
                        : `Due ${new Date(mistake.nextReviewAt).toLocaleDateString()}`}
                    </span>
                    <h3>{mistake.questionRef}</h3>
                    <p>
                      Selected {mistake.selected}; correct answer {mistake.correct}.
                    </p>
                    <label className="error-type-field">
                      Error diagnosis
                      <select
                        aria-label={`Error type for ${mistake.questionRef}`}
                        onChange={(event) =>
                          onErrorTypeChange(
                            mistake.id,
                            event.target.value as ErrorType,
                          )
                        }
                        value={mistake.errorType}
                      >
                        {errorTypes.map((type) => (
                          <option key={type} value={type}>
                            {type.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={!due}
                    onClick={() => onReview(mistake.id)}
                  >
                    <RotateCcw size={16} /> Mark reviewed
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
