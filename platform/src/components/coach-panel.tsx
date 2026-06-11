"use client";

import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Brain, Lightbulb, Send, Sparkles } from "lucide-react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { practiceQuestions } from "@/data/practice-questions";
import type {
  AnswerChoice,
  PracticeAttempt,
  PracticeQuestion,
  ThinkingReplayCoachContext,
} from "@/lib/domain";

interface CoachPanelProps {
  replayContext?: ThinkingReplayCoachContext;
  onPracticeAttempt: (attempt: PracticeAttempt) => void;
  onIncorrect: (
    question: PracticeQuestion,
    selected: AnswerChoice,
    hintLevelUsed: number,
  ) => void;
  onMasteryGain: (topicId: string, gain: number) => void;
}

const choices: AnswerChoice[] = ["A", "B", "C", "D", "E"];
const hintNames = ["Understand", "Tool", "Strategy", "Key step", "Full solution"];

export function CoachPanel({
  replayContext,
  onPracticeAttempt,
  onIncorrect,
  onMasteryGain,
}: CoachPanelProps) {
  const [questionIndex, setQuestionIndex] = useState(() => {
    const replayQuestionIndex = replayContext
      ? practiceQuestions.findIndex(
          (question) => question.id === replayContext.questionId,
        )
      : -1;
    return Math.max(0, replayQuestionIndex);
  });
  const [selected, setSelected] = useState<AnswerChoice | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [minimaxConfigured, setMinimaxConfigured] = useState<boolean | null>(null);
  const question = practiceQuestions[questionIndex % practiceQuestions.length];
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    let active = true;
    fetch("/api/ai-status")
      .then((response) => response.json())
      .then((result: { minimaxConfigured?: boolean }) => {
        if (active) setMinimaxConfigured(Boolean(result.minimaxConfigured));
      })
      .catch(() => {
        if (active) setMinimaxConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function requestNextHint() {
    setHintLevel((current) => Math.min(5, current + 1));
  }

  function submitAnswer() {
    if (!selected) return;
    const correct = selected === question.answer;
    setSubmitted(true);
    onPracticeAttempt({
      id: crypto.randomUUID(),
      questionId: question.id,
      correct,
      selected,
      hintLevelUsed: hintLevel,
      toolTags: question.toolTags,
      createdAt: new Date().toISOString(),
    });
    if (correct) {
      onMasteryGain(question.topicId, Math.max(5, 20 - hintLevel * 3));
    } else {
      onIncorrect(question, selected, hintLevel);
    }
  }

  function nextQuestion() {
    setQuestionIndex((index) => index + 1);
    setSelected(null);
    setSubmitted(false);
    setHintLevel(0);
    setPrompt("");
  }

  async function askCoach() {
    if (!prompt.trim() || status === "streaming" || status === "submitted") return;
    const requestedLevel = Math.max(1, Math.min(5, hintLevel || 1));
  const contextualPrompt = [
      "Student: Matt. Target: 20 correct on the 2027-01-22 AMC 8.",
      `Problem: ${question.prompt}`,
      `Choices: ${choices.map((choice) => `${choice}) ${question.choices[choice]}`).join("; ")}`,
      `Relevant tools: ${question.toolTags.join(", ")}`,
      replayContext
        ? `Thinking Replay context: ${JSON.stringify(replayContext)}`
        : "Thinking Replay context: none.",
      `Hint level requested: ${requestedLevel} (${hintNames[requestedLevel - 1]}).`,
      `Student question: ${prompt}`,
      requestedLevel < 5
        ? "Do not reveal the final answer. Give only the requested level of guidance and end with one concrete question for Matt."
        : "A full solution is allowed. Explain the key tool and the shortest stable path.",
    ].join("\n");
    await sendMessage({ text: contextualPrompt });
    setPrompt("");
  }

  return (
    <div className="space-y-6">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Matt&apos;s AI problem-solving coach</p>
          <h2>Think first. Reveal one level at a time.</h2>
        </div>
        <p>
          The five-level hint ladder protects independent thinking. Reaching a
          full solution lowers the independence component of Readiness.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <section className="panel question-card">
          <div className="panel-heading">
            <span className="status-pill">{question.domain}</span>
            <span className="difficulty">Level {question.difficulty}/5</span>
          </div>
          <div className="tool-tags">
            {question.toolTags.map((tool) => (
              <span key={tool}>{tool.replaceAll("_", " ")}</span>
            ))}
          </div>
          <h3>{question.prompt}</h3>
          <div className="choice-list">
            {choices.map((choice) => (
              <button
                className={selected === choice ? "selected" : ""}
                disabled={submitted}
                key={choice}
                onClick={() => setSelected(choice)}
              >
                <strong>{choice}</strong>
                <span>{question.choices[choice]}</span>
              </button>
            ))}
          </div>

          <div className="hint-ladder" aria-label="Hint ladder">
            {hintNames.map((name, index) => (
              <div
                className={hintLevel > index ? "revealed" : ""}
                key={name}
                title={`Hint ${index + 1}: ${name}`}
              >
                <strong>{index + 1}</strong>
                <span>{name}</span>
              </div>
            ))}
          </div>

          {hintLevel > 0 && (
            <div className="hint-card">
              <strong>
                Hint {hintLevel}: {hintNames[hintLevel - 1]}
              </strong>
              <p>{question.hintLadder[hintLevel - 1]}</p>
            </div>
          )}

          <div className="submit-row coach-actions">
            <button
              className="secondary-button"
              disabled={hintLevel >= 5 || submitted}
              onClick={requestNextHint}
            >
              <Lightbulb size={16} />
              {hintLevel ? "Next hint" : "Start hint ladder"}
            </button>
            {!submitted ? (
              <button
                className="primary-button"
                disabled={!selected}
                onClick={submitAnswer}
              >
                Check answer
              </button>
            ) : (
              <button className="primary-button" onClick={nextQuestion}>
                Next problem
              </button>
            )}
          </div>

          {submitted && (
            <div
              className={
                selected === question.answer ? "feedback correct" : "feedback incorrect"
              }
            >
              <strong>
                {selected === question.answer
                  ? "Correct. Keep the method, not just the answer."
                  : `Not yet. The correct choice is ${question.answer}.`}
              </strong>
              <p>{question.explanation}</p>
            </div>
          )}
        </section>

        <section className="panel coach-chat">
          <div className="panel-heading">
            <div className="flex items-center gap-2">
              <Brain size={20} />
              <h3>Ask the coach</h3>
            </div>
            <span className="status-pill">
              {minimaxConfigured === null
                ? "Checking MiniMax"
                : minimaxConfigured
                  ? "MiniMax coach active"
                  : "Local coaching only"}
            </span>
          </div>
          <div className="coach-target-note">
            <Sparkles size={16} />
            {replayContext ? (
              <span>
                Thinking Replay:{" "}
                <strong>
                  {replayContext.processPattern.replaceAll("_", " ")};{" "}
                  {replayContext.pauseCount} long pauses;{" "}
                  {replayContext.revisionCount} revisions
                </strong>
              </span>
            ) : (
              <span>
                Current AI guidance level:{" "}
                <strong>
                  {hintLevel || 1} - {hintNames[(hintLevel || 1) - 1]}
                </strong>
              </span>
            )}
          </div>
          <div className="chat-stream">
            {messages.length === 0 && (
              <div className="empty-chat">
                Describe where you are stuck. The coach will stay at the current
                hint level instead of jumping to the answer.
              </div>
            )}
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <MessageResponse key={index}>{part.text}</MessageResponse>
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))}
          </div>
          {error && (
            <p className="ai-note">
              MiniMax could not answer this request. The built-in hint ladder
              remains available.
            </p>
          )}
          <div className="chat-input">
            <textarea
              aria-label="Question for AI coach"
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void askCoach();
                }
              }}
              placeholder="I understand the setup, but I cannot see which tool to use."
              value={prompt}
            />
            <button
              aria-label="Send to AI coach"
              disabled={!prompt.trim() || status === "streaming"}
              onClick={() => void askCoach()}
            >
              <Send size={18} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
