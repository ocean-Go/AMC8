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
      "You are Matt's AMC 8 coach. His target is 20 correct answers on January 22, 2027. Use concise, calm Socratic guidance. Respect the requested hint level: 1 understand, 2 tool, 3 strategy, 4 key step, 5 full solution. Never reveal the final answer below level 5. Emphasize reusable problem-solving tools, check arithmetic carefully, and use accessible English.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
