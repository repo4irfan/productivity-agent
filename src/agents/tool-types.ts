import { z } from "zod";

export type OpenAIToolParameters = {
  type: "object";
  properties: Record<string, unknown>;
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