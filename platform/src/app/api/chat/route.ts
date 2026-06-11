import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createMiniMaxProvider } from "@/lib/minimax";

export async function POST(request: Request) {
  if (!process.env.MINIMAX_API_KEY) {
    return Response.json(
      { error: "MINIMAX_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await request.json();
  const minimax = createMiniMaxProvider();
  const result = streamText({
    model: minimax.chat(process.env.MINIMAX_MODEL ?? "MiniMax-M3"),
    system:
      "You are an AMC 8 coach for middle-school students. Use concise Socratic guidance. Never reveal the final answer on the first response. Check arithmetic carefully and use accessible English.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
