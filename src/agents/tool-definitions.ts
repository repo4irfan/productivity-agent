import { toolRegistry } from "./tool-registry";
import type { LLMToolDefinition } from "../llm/llm-client";

export const toolDefinitions: LLMToolDefinition[] = Object.values(
  toolRegistry
).map((tool) => ({
  name: tool.name,
  description: tool.description,
  parameters: tool.openAISchema,
}));