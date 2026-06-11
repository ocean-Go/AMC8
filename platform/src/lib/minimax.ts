import { createOpenAI } from "@ai-sdk/openai";

export function createMiniMaxProvider() {
  return createOpenAI({
    name: "minimax",
    baseURL: process.env.MINIMAX_BASE_URL ?? "https://api.minimaxi.com/v1",
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
}
