import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const client = new OpenAI();

const memoryExtractionSchema = z.object({
  shouldRemember: z.boolean(),
  memory: z.string().nullable(),
});

export type MemoryExtractionResult = z.infer<
  typeof memoryExtractionSchema
>;

export async function extractMemory(
  message: string
): Promise<MemoryExtractionResult> {
  const response = await client.responses.parse({
    model: "gpt-5-mini",

    instructions: `
      You are a memory extraction system.

      Analyze the user's message and determine whether
      it contains useful information that should be remembered
      for future conversations.

      Remember information such as:
      - User preferences
      - Long-term goals
      - Work habits
      - Stable facts that improve future assistance
      - Recurring preferences or workflows

      Do NOT remember:
      - Normal task requests
      - Temporary actions
      - Casual conversation
      - One-time instructions
      - Information unlikely to be useful later

      If the message contains useful long-term information:
      - shouldRemember must be true
      - memory must contain a concise description of the useful information

      Otherwise:
      - shouldRemember must be false
      - memory must be null
    `,

    input: message,

    text: {
      format: zodTextFormat(
        memoryExtractionSchema,
        "memory_extraction"
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("Memory extraction returned no structured result");
  }

  return response.output_parsed;
}