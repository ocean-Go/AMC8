"use client";

import { CheckCircle2 } from "lucide-react";
import { knowledgeDomains, knowledgeTopics } from "@/data/knowledge";
import type { StudentState } from "@/lib/domain";

interface KnowledgePanelProps {
  student: StudentState;
  onMasteryChange: (topicId: string, value: number) => void;
}

export function KnowledgePanel({
  student,
  onMasteryChange,
}: KnowledgePanelProps) {
  return (
    <div className="space-y-7">
      <header className="page-heading">
        <div>
          <p className="eyebrow">100% knowledge map</p>
          <h2>AMC 8 curriculum</h2>
        </div>
        <p>
          A topic reaches mastery at 80%. Use the checkpoints to record lesson,
          guided practice, and independent performance.
        </p>
      </header>

      {knowledgeDomains.map((domain) => (
        <section className="panel" key={domain}>
          <div className="panel-heading">
            <h3>{domain}</h3>
            <span className="status-pill">
              {knowledgeTopics.filter((topic) => topic.domain === domain).length} topics
            </span>
          </div>
          <div className="topic-grid">
            {knowledgeTopics
              .filter((topic) => topic.domain === domain)
              .map((topic) => {
                const mastery = student.mastery[topic.id] ?? 0;
                return (
                  <article className="topic-card" key={topic.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4>{topic.title}</h4>
                        <p>{topic.description}</p>
                      </div>
                      {mastery >= 80 && (
                        <CheckCircle2
                          className="text-emerald-600"
                          aria-label="Mastered"
                          size={20}
                        />
                      )}
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                        <span>Mastery</span>
                        <span>{mastery}%</span>
                      </div>
                      <input
                        aria-label={`${topic.title} mastery`}
                        className="mastery-slider"
                        max="100"
                        min="0"
                        onChange={(event) =>
                          onMasteryChange(topic.id, Number(event.target.value))
                        }
                        step="20"
                        type="range"
                        value={mastery}
                      />
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
