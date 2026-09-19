import ollama, { type Message, type Tool, type ToolCall } from "ollama";

import type { AgentMessage } from "../agents/agent-state";

import type {
  LLMClient,
  EmbeddingClient,
  LLMChatRequest,
  LLMChatResponse,
  LLMToolCall,
  LLMToolDefinition,
} from "./llm-client";

export type OllamaClientOptions = {
  model: string;
  embeddingModel: string;
  numCtx?: number;
  debug?: boolean;
};

export class OllamaClient implements LLMClient, EmbeddingClient {
  constructor(private readonly options: OllamaClientOptions) {}

  get embeddingModel(): string {
    return this.options.embeddingModel;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await ollama.embed({
      model: this.options.embeddingModel,
      input: texts,
    });

    return response.embeddings;
  }

  async chat(request: LLMChatRequest): Promise<LLMChatResponse> {
    const response = await ollama.chat({
      model: this.options.model,
      messages: [
        { role: "system", content: request.system },
        ...request.messages.map(toOllamaMessage),
      ],
      tools: request.tools?.map(toOllamaTool),
      format: request.jsonSchema,
      options: { num_ctx: this.options.numCtx ?? 8192 },
    });

    if (this.options.debug) {
      console.log("Ollama response:", JSON.stringify(response, null, 2));
    }

    return {
      content: response.message.content,
      toolCalls: (response.message.tool_calls ?? []).map(toLLMToolCall),
    };
  }
}

// ---------------------------------------------------------------
// Neutral format  →  Ollama format
// ---------------------------------------------------------------

export function toOllamaMessage(message: AgentMessage): Message {
  switch (message.role) {
    case "tool":
      return {
        role: "tool",
        content: message.content,
        tool_name: message.tool_name,
      };

    case "assistant":
      if ("tool_calls" in message) {
        return {
          role: "assistant",
          content: message.content,
          tool_calls: message.tool_calls.map((call) => ({
            function: {
              name: call.name,
              arguments: call.arguments,
            },
          })),
        };
      }

      return { role: "assistant", content: message.content };

    default:
      return { role: message.role, content: message.content };
  }
}

function toOllamaTool(tool: LLMToolDefinition): Tool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

// ---------------------------------------------------------------
// Ollama format  →  Neutral format
// ---------------------------------------------------------------

function toLLMToolCall(toolCall: ToolCall): LLMToolCall {
  return {
    id: getToolCallId(toolCall),
    name: toolCall.function.name,
    arguments: toolCall.function.arguments,
  };
}

function getToolCallId(toolCall: ToolCall): string {
  const maybeId = (toolCall as { id?: unknown }).id;

  return typeof maybeId === "string" && maybeId
    ? maybeId
    : `call_${crypto.randomUUID()}`;
}