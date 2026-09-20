import { searchMemories, type Memory } from "./memory-repository";

const MAX_RELEVANT_MEMORIES = 3;

export async function retrieveRelevantMemories(
  message: string
): Promise<Memory[]> {
  try {
    return await searchMemories(message, MAX_RELEVANT_MEMORIES);
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