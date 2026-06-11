import { generateText } from "ai";
import { z } from "zod";
import type {
  SolutionAnalysis,
  SolutionProcessMetrics,
} from "@/lib/domain";
import { createLocalSolutionAnalysis } from "@/lib/solution-paper";
import { createMiniMaxProvider } from "@/lib/minimax";

const requestSchema = z.object({
  questionPrompt: z.string().min(1).max(2_000),
  correctAnswer: z.string().optional(),
  studentAnswer: z.string().optional(),
  imageDataUrl: z.string().startsWith("data:image/png;base64,"),
  metrics: z.object({
    durationSeconds: z.number().nonnegative(),
    activeSeconds: z.number().nonnegative(),
    idleSeconds: z.number().nonnegative(),
    strokeCount: z.number().int().nonnegative(),
    eraserStrokeCount: z.number().int().nonnegative(),
    undoCount: z.number().int().nonnegative(),
    redoCount: z.number().int().nonnegative(),
    clearCount: z.number().int().nonnegative(),
    pauseCount: z.number().int().nonnegative(),
    longPauseCount: z.number().int().nonnegative(),
    veryLongPauseCount: z.number().int().nonnegative(),
    longestPauseSeconds: z.number().nonnegative(),
    revisionCount: z.number().int().nonnegative(),
    revisionClusterDetected: z.boolean(),
    firstStrokeDelaySeconds: z.number().nonnegative(),
  }),
  thinkingReplaySummary: z.object({
    totalTimeSeconds: z.number().nonnegative(),
    activeWritingSeconds: z.number().nonnegative(),
    idleTimeSeconds: z.number().nonnegative(),
    strokeCount: z.number().int().nonnegative(),
    pauseCount: z.number().int().nonnegative(),
    longPauseCount: z.number().int().nonnegative(),
    veryLongPauseCount: z.number().int().nonnegative(),
    longestPauseSeconds: z.number().nonnegative(),
    eraseCount: z.number().int().nonnegative(),
    undoCount: z.number().int().nonnegative(),
    redoCount: z.number().int().nonnegative(),
    clearCount: z.number().int().nonnegative(),
    revisionCount: z.number().int().nonnegative(),
    revisionClusterDetected: z.boolean(),
    processPattern: z.string(),
    phases: z.array(
      z.object({
        phase: z.enum(["think", "plan", "execute", "verify"]),
        startSeconds: z.number().nonnegative(),
        endSeconds: z.number().nonnegative(),
        durationSeconds: z.number().nonnegative(),
        confidence: z.enum(["low", "medium", "high"]),
        evidence: z.string(),
        commentary: z.string(),
      }),
    ),
    timeline: z.array(
      z.object({
        id: z.string(),
        timestamp: z.number().nonnegative(),
        type: z.enum([
          "start",
          "phase_change",
          "pause",
          "revision",
          "answer",
          "submit",
        ]),
        label: z.string(),
        commentary: z.string(),
      }),
    ),
    observation: z.string(),
    suggestedNextAction: z.string(),
  }),
  replayMarkers: z.array(
    z.object({
      timestamp: z.number().nonnegative(),
      type: z.string(),
      label: z.string(),
      description: z.string().optional(),
    }),
  ),
});

const analysisSchema = z.object({
  summary: z.string(),
  approach: z.array(z.string()).max(6),
  strengths: z.array(z.string()).max(5),
  unclearPoints: z.array(z.string()).max(5),
  errors: z.array(z.string()).max(5),
  suggestions: z.array(z.string()).max(5),
  notableIdea: z.string().nullable(),
});

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid solution paper payload." }, { status: 400 });
  }

  const {
    questionPrompt,
    correctAnswer,
    studentAnswer,
    imageDataUrl,
    metrics,
    thinkingReplaySummary,
    replayMarkers,
  } = parsed.data;
  const fallback = createLocalSolutionAnalysis(
    metrics as SolutionProcessMetrics,
  );

  if (!process.env.MINIMAX_API_KEY) {
    return Response.json(fallback);
  }

  try {
    const minimax = createMiniMaxProvider();
    const result = await generateText({
      model: minimax.chat(process.env.MINIMAX_MODEL ?? "MiniMax-M3"),
      system:
        "You analyze a middle-school student's handwritten AMC 8 solution. Be supportive and precise. Distinguish visible evidence from inference. Do not invent handwriting you cannot read. Return JSON only.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Problem: ${questionPrompt}`,
                `Correct answer: ${correctAnswer ?? "not provided"}`,
                `Student answer: ${studentAnswer ?? "not provided"}`,
                `Thinking Replay summary: ${JSON.stringify(thinkingReplaySummary)}`,
                `Timeline markers: ${JSON.stringify(replayMarkers)}`,
                `Raw process metrics: ${JSON.stringify(metrics)}`,
                "Analyze the final handwritten page together with the process timeline for Matt's 20/25 AMC8 target.",
                "The Think, Plan, Execute, and Verify phases are deterministic timing inferences. Treat them as context, not proof of what Matt wrote or thought.",
                "Use the image itself for semantic claims such as a detected equation, diagram, casework, enumeration, or verification step.",
                "Return exactly this JSON shape:",
                '{"summary":"...","approach":["..."],"strengths":["..."],"unclearPoints":["..."],"errors":["..."],"suggestions":["..."],"notableIdea":null}',
                "Use short, child-friendly English. Connect feedback to tool recognition, casework, enumeration, diagrams, calculation accuracy, time management, or independence. If handwriting is unreadable or incomplete, say so explicitly and do not invent content.",
              ].join("\n"),
            },
            {
              type: "image",
              image: imageDataUrl,
              mediaType: "image/png",
            },
          ],
        },
      ],
    });
    const output = analysisSchema.parse(extractJson(result.text));
    const analysis: SolutionAnalysis = { source: "minimax", ...output };
    return Response.json(analysis);
  } catch {
    return Response.json(fallback);
  }
}
