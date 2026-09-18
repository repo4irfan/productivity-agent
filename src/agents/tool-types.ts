import { z } from "zod";

export type ToolParameterProperty = {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  items?: unknown;
};

export type OpenAIToolParameters = {
  type: "object";
  properties: Record<string, ToolParameterProperty>;
  required: string[];
  additionalProperties: false;
};

export type AgentTool<TArgs, TResult> = {
  name: string;
  description: string;
  schema: z.ZodType<TArgs>;
  openAISchema: OpenAIToolParameters;
  execute: (args: TArgs) => Promise<TResult>;
};

// Loosened view of any registered tool, used by the router.
export type AnyAgentTool = AgentTool<any, unknown>;