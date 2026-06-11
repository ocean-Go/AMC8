import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const minimaxBaseUrl =
  process.env.MINIMAX_BASE_URL ?? "https://api.minimaxi.com/v1";

export async function POST(request: Request) {
  if (!process.env.MINIMAX_API_KEY) {
    return Response.json(
      { error: "MINIMAX_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await request.json();
  const minimax = createOpenAI({
    name: "minimax",
    baseURL: minimaxBaseUrl,
    apiKey: process.env.MINIMAX_API_KEY,
    fetch: async (input, init) => {
      if (typeof init?.body !== "string") {
        return fetch(input, init);
      }

      const body = JSON.parse(init.body) as Record<string, unknown>;
      return fetch(input, {
        ...init,
        body: JSON.stringify({
          ...body,
          thinking: { type: "disabled" },
        }),
      });
    },
  });
  const result = streamText({
    model: minimax.chat(process.env.MINIMAX_MODEL ?? "MiniMax-M3"),
    system:
      "You are an AMC 8 coach for middle-school students. Use concise Socratic guidance. Never reveal the final answer on the first response. Check arithmetic carefully and use accessible English.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
