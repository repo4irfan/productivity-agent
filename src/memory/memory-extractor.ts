import OpenAI from "openai";

const client = new OpenAI();

export type MemoryExtractionResult = {
  shouldRemember: boolean;
  memory: string | null;
};

export async function extractMemory(
  message: string
): Promise<MemoryExtractionResult> {
  const response = await client.responses.create({
    model: "gpt-5-mini",

    instructions: `
      You are a memory extraction system.

      Determine whether the user's message contains
      useful information that should be remembered
      for future conversations.

      Good memories include:
      - User preferences
      - Long-term goals
      - Work habits
      - Important recurring information
      - Stable facts that could improve future assistance

      Do NOT remember:
      - Normal task requests
      - Temporary actions
      - Casual conversation
      - Information that is unlikely to be useful later

      Return JSON with:
      {
        "shouldRemember": boolean,
        "memory": string | null
      }

      If the information should not be remembered,
      set memory to null.
    `,

    input: message,
  });

  return JSON.parse(response.output_text);
}