import type { AgentMessage } from "../agents/agent-state";
import type { OpenAIToolParameters } from "../agents/tool-types";

export type LLMToolDefinition = {
  name: string;
  description: string;
  parameters: OpenAIToolParameters;
};

export type LLMToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type LLMUsage = {
  promptTokens: number;
  cachedTokens: number;
  completionTokens: number;
};

export type LLMChatRequest = {
  purpose: string;              // "agent" | "memory-extraction" | "summarization"
  system: string;
  messages: AgentMessage[];
  tools?: LLMToolDefinition[];
  jsonSchema?: Record<string, unknown>;
};

export type LLMChatResponse = {
  content: string;
  toolCalls: LLMToolCall[];
  usage?: LLMUsage;
};

export type EmbedKind = "query" | "document";

export interface LLMClient {
  chat(request: LLMChatRequest): Promise<LLMChatResponse>;
}

export interface EmbeddingClient {
  readonly embeddingModel: string;
  embed(texts: string[], kind: EmbedKind): Promise<number[][]>;
}