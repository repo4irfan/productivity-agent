import ollama from "ollama";
import { z } from "zod";

const MODEL = "qwen2.5:7b";

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
  try {
    const response = await ollama.chat({
      model: MODEL,

      messages: [
        {
          role: "system",
          content: `
  You are a memory extraction system.

  Analyze the user's message and determine whether it
  contains useful information that should be remembered
  for future conversations.

  Remember:
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

  Return ONLY valid JSON in this format:

  {
    "shouldRemember": true,
    "memory": "A concise description of the information"
  }

  If there is nothing worth remembering:

  {
    "shouldRemember": false,
    "memory": null
  }
  `,
        },
        {
          role: "user",
          content: message,
        },
      ],

      format: {
        type: "object",
        properties: {
          shouldRemember: {
            type: "boolean",
          },
          memory: {
            type: ["string", "null"],
          },
        },
        required: ["shouldRemember", "memory"],
      },
      options: { num_ctx: 8192 },
    });

    const parsed = JSON.parse(response.message.content);

    return memoryExtractionSchema.parse(parsed);
  } catch (error) {
    console.warn("Memory extraction failed; skipping.", error);

    return {
      shouldRemember: false,
      memory: null,
    };
  }
}