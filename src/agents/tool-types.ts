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
  /** When true, this tool's output is the final reply; the model does not see it. */
  returnDirect?: boolean;
  execute: (args: TArgs) => Promise<TResult>;
};

// Loosened view of any registered tool, used by the router.
export type AnyAgentTool = AgentTool<any, unknown>;