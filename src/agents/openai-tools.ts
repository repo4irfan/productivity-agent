import { toolRegistry } from "./tool-registry";

export const openAITools = Object.values(toolRegistry).map(
  (tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.openAISchema,
    strict: true,
  })
);