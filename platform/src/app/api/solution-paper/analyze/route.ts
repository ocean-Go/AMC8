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
  imageDataUrl: z.string().startsWith("data:image/png;base64,"),
  metrics: z.object({
    durationSeconds: z.number().nonnegative(),
    activeSeconds: z.number().nonnegative(),
    strokeCount: z.number().int().nonnegative(),
    eraserStrokeCount: z.number().int().nonnegative(),
    undoCount: z.number().int().nonnegative(),
    pauseCount: z.number().int().nonnegative(),
    longestPauseSeconds: z.number().nonnegative(),
  }),
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

  const { questionPrompt, imageDataUrl, metrics } = parsed.data;
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
                `Process metrics: ${JSON.stringify(metrics)}`,
                "Analyze the final handwritten page and the process metrics.",
                "Return exactly this JSON shape:",
                '{"summary":"...","approach":["..."],"strengths":["..."],"unclearPoints":["..."],"errors":["..."],"suggestions":["..."],"notableIdea":null}',
                "Use short, child-friendly English. If the work is unreadable or incomplete, say so explicitly.",
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
