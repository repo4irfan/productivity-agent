import { z } from "zod";

export type AgentTool<TArgs, TResult> = {
  name: string;
  description: string;
  schema: z.ZodType<TArgs>;
  execute: (args: TArgs) => Promise<TResult>;
};