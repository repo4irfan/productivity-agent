import { toolRegistry } from "./tool-registry";
import { externalToolDefinitions } from "../mcp/client-manager";
import type { LLMToolDefinition } from "../llm/llm-client";

const localToolDefinitions: LLMToolDefinition[] = Object.values(toolRegistry).map(
  (tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.openAISchema,
  })
);

export function getToolDefinitions(): LLMToolDefinition[] {
  return [...localToolDefinitions, ...externalToolDefinitions()];
}