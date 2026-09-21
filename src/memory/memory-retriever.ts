import { searchMemories, type Memory } from "./memory-repository";
import { traced } from "../observability/tracer";

const MAX_RELEVANT_MEMORIES = 3;

export async function retrieveRelevantMemories(
  message: string
): Promise<Memory[]> {
  try {
    return await traced(
      "retrieval",
      "memories",
      () => searchMemories(message, MAX_RELEVANT_MEMORIES),
      (memories) => ({ count: memories.length, topScore: memories[0]?.score ?? null })
    );
  } catch (error) {
    console.warn("Memory retrieval failed; continuing without.", error);
    return [];
  }
}

export function formatMemoryContext(memories: Memory[]): string {
  if (memories.length === 0) {
    return "";
  }

  const lines = memories.map((memory) => `- ${memory.content}`);

  return `[Context — what you know about the user from earlier conversations:
${lines.join("\n")}]

`;
}