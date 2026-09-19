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

export type LLMChatRequest = {
  system: string;
  messages: AgentMessage[];
  tools?: LLMToolDefinition[];
  jsonSchema?: Record<string, unknown>;
};

export type LLMChatResponse = {
  content: string;
  toolCalls: LLMToolCall[];
};

export interface LLMClient {
  chat(request: LLMChatRequest): Promise<LLMChatResponse>;
}

export interface EmbeddingClient {
  readonly embeddingModel: string;
  embed(texts: string[]): Promise<number[][]>;
}