import type { ResponseInputItem } from "openai/resources/responses/responses";

export type AgentState = {
  conversation: ResponseInputItem[];
};