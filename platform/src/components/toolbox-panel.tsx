"use client";

import { Wrench } from "lucide-react";
import type { ProblemSolvingTool, StudentState } from "@/lib/domain";
import { toolMasteryScores } from "@/lib/learning";

const priorityTools: ProblemSolvingTool[] = [
  "casework",
  "enumeration",
  "parity",
  "complement",
  "area_method",
  "working_backwards",
  "pigeonhole",
  "invariant",
  "symmetry",
];

const descriptions: Record<ProblemSolvingTool, string> = {
  parity: "Use odd/even structure to eliminate impossible cases.",
  divisibility: "Use factors and divisibility rules before calculating.",
  modular_arithmetic: "Track remainders and repeating cycles.",
  enumeration: "List possibilities systematically without duplicates.",
  casework: "Split a problem into complete, non-overlapping cases.",
  construction: "Build an example that satisfies the conditions.",
  contradiction: "Assume the opposite and find an impossibility.",
  extreme_principle: "Focus on the largest, smallest, first, or last object.",
  pigeonhole: "Force repetition by comparing objects with containers.",
  invariant: "Find a quantity that does not change.",
  symmetry: "Use equivalent positions or balanced configurations.",
  recursion: "Relate a larger case to smaller cases.",
  coordinate_method: "Turn geometry into coordinates and equations.",
  area_method: "Use area relationships to recover lengths or ratios.",
  complement: "Count everything, then subtract unwanted cases.",
  inclusion_exclusion: "Correct overlap when combining groups.",
  working_backwards: "Reverse the operations from the desired result.",
  pattern_recognition: "Generate small cases and identify a stable pattern.",
};

export function ToolboxPanel({ student }: { student: StudentState }) {
  const scores = new Map(
    toolMasteryScores(student).map((item) => [item.tool, item]),
  );

  return (
    <div className="space-y-6">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Problem solving toolbox</p>
          <h2>Recognize the tool before doing the arithmetic.</h2>
        </div>
        <p>
          For a 20/25 target, method recognition matters as much as knowing the
          underlying topic. Scores combine correctness and independence.
        </p>
      </header>
      <section className="toolbox-grid">
        {priorityTools.map((tool) => {
          const score = scores.get(tool);
          return (
            <article className="panel tool-card" key={tool}>
              <div className="tool-card-heading">
                <Wrench size={18} />
                <span className="status-pill">
                  {score?.masteryScore ?? 0}%
                </span>
              </div>
              <h3>{tool.replaceAll("_", " ")}</h3>
              <p>{descriptions[tool]}</p>
              <div className="coverage-bar">
                <span style={{ width: `${score?.masteryScore ?? 0}%` }} />
              </div>
              <small>
                {score?.attemptedQuestions ?? 0} attempts /{" "}
                {score?.correctQuestions ?? 0} correct
              </small>
            </article>
          );
        })}
      </section>
    </div>
  );
}
