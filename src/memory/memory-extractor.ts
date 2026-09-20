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
- Questions. A question the user asks is NEVER a memory, no matter how
  useful the answer would be.
- Anything phrased as "the user wants to know" or "the user asked"
- Normal task requests
- Temporary actions
- Casual conversation
- One-time instructions
- Information unlikely to be useful later

Examples:

"I prefer working on backend tasks in the morning"
→ { "shouldRemember": true, "memory": "Prefers working on backend tasks in the morning." }

"when am I most productive?"
→ { "shouldRemember": false, "memory": null }

"create a task called fix login bug"
→ { "shouldRemember": false, "memory": null }

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