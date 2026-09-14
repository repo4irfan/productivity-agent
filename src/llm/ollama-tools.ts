import { toolRegistry } from "../agents/tool-registry";

export const ollamaTools = Object.values(toolRegistry).map((tool) => ({
  type: "function" as const,

  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.openAISchema,
  },
}));