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
  ExperimentEvent,
  PracticeQuestion,
  StudentId,
} from "@/lib/domain";
import { getExperimentVariant } from "@/lib/learning";

interface CoachPanelProps {
  studentId: StudentId;
  onEvent: (event: ExperimentEvent) => void;
  onIncorrect: (question: PracticeQuestion, selected: AnswerChoice) => void;
  onMasteryGain: (topicId: string, gain: number) => void;
}

const choices: AnswerChoice[] = ["A", "B", "C", "D", "E"];

export function CoachPanel({
  studentId,
  onEvent,
  onIncorrect,
  onMasteryGain,
}: CoachPanelProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<AnswerChoice | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [minimaxConfigured, setMinimaxConfigured] = useState<boolean | null>(null);
  const question = practiceQuestions[questionIndex % practiceQuestions.length];
  const variant = getExperimentVariant(studentId);
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

  function record(name: ExperimentEvent["name"], correct?: boolean) {
    onEvent({
      id: crypto.randomUUID(),
      studentId,
      variant,
      name,
      correct,
      createdAt: new Date().toISOString(),
    });
  }

  function submitAnswer() {
    if (!selected) return;
    const correct = selected === question.answer;
    setSubmitted(true);
    record("answer_submitted", correct);
    if (correct) onMasteryGain(question.topicId, 20);
    else onIncorrect(question, selected);
  }

  function nextQuestion() {
    setQuestionIndex((index) => index + 1);
    setSelected(null);
    setSubmitted(false);
    setShowHint(false);
    record("session_completed");
  }

  async function askCoach() {
    if (!prompt.trim() || status === "streaming" || status === "submitted") return;
    const contextualPrompt = [
      `Student: ${studentId}. A/B mode: ${variant}.`,
      `Problem: ${question.prompt}`,
      `Choices: ${choices.map((choice) => `${choice}) ${question.choices[choice]}`).join("; ")}`,
      `Student question: ${prompt}`,
      "Do not reveal the final choice immediately. Ask one useful question or give one small hint.",
    ].join("\n");
    await sendMessage({ text: contextualPrompt });
    setPrompt("");
  }

  return (
    <div className="space-y-6">
      <header className="page-heading">
        <div>
          <p className="eyebrow">AI problem-solving coach</p>
          <h2>Think first. Reveal less.</h2>
        </div>
        <p>
          Mode {variant}:{" "}
          {variant === "A"
            ? "progressive hints before worked solutions."
            : "a parallel worked example before targeted hints."}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <section className="panel question-card">
          <div className="panel-heading">
            <span className="status-pill">{question.domain}</span>
            <span className="difficulty">Level {question.difficulty}/5</span>
          </div>
          {variant === "B" && !submitted && (
            <div className="example-card">
              <Sparkles size={17} />
              <p>
                <strong>Parallel example:</strong>{" "}
                {question.domain === "Geometry"
                  ? "Sketch the figure, label known lengths, then identify base and height."
                  : "Replace the story with a variable or a small organized table before calculating."}
              </p>
            </div>
          )}
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
          <div className="submit-row">
            <button
              className="secondary-button"
              onClick={() => {
                setShowHint(true);
                record("hint_used");
              }}
            >
              <Lightbulb size={16} /> Show hint
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
          {showHint && <div className="hint-card">{question.hint}</div>}
          {submitted && (
            <div
              className={
                selected === question.answer ? "feedback correct" : "feedback incorrect"
              }
            >
              <strong>
                {selected === question.answer
                  ? "Correct. Nice structure."
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
          <div className="chat-stream">
            {messages.length === 0 && (
              <div className="empty-chat">
                Ask why a method works, request a smaller hint, or describe where
                your reasoning got stuck.
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
              MiniMax could not answer this request. Built-in hints and solutions
              remain available.
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
              placeholder="I understand the setup, but why do we divide here?"
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
