import { z } from "zod";
import { getLLMClient } from "../llm";

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

        const response = await getLLMClient().chat({
      system: `
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
      messages: [{ role: "user", content: message }],
      jsonSchema: {
        type: "object",
        properties: {
          shouldRemember: { type: "boolean" },
          memory: { type: ["string", "null"] },
        },
        required: ["shouldRemember", "memory"],
      },
    });

    const parsed = JSON.parse(response.content);

    return memoryExtractionSchema.parse(parsed);
  } catch (error) {
    console.warn("Memory extraction failed; skipping.", error);

    return {
      shouldRemember: false,
      memory: null,
    };
  }
}