import OpenAI from "openai";

import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions";

import type { AgentMessage } from "../agents/agent-state";

import type {
  LLMClient,
  LLMChatRequest,
  LLMChatResponse,
  LLMToolCall,
  LLMToolDefinition,
} from "./llm-client";

export type OpenAIClientOptions = {
  model: string;
  apiKey?: string;
  debug?: boolean;
};

export class OpenAIClient implements LLMClient {
  private readonly client: OpenAI;

  constructor(private readonly options: OpenAIClientOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
  }

  async chat(request: LLMChatRequest): Promise<LLMChatResponse> {
    const response = await this.client.chat.completions.create({
      model: this.options.model,
      messages: [
        { role: "system", content: request.system },
        ...request.messages.map(toOpenAIMessage),
      ],
      tools: request.tools?.map(toOpenAITool),
      response_format: request.jsonSchema
        ? {
            type: "json_schema",
            json_schema: { name: "response", schema: request.jsonSchema },
          }
        : undefined,
    });

    if (this.options.debug) {
      console.log("OpenAI response:", JSON.stringify(response, null, 2));
    }

    const message = response.choices[0]?.message;

    return {
      content: message?.content ?? "",
      toolCalls: (message?.tool_calls ?? []).map(toLLMToolCall),
    };
  }
}

// ---------------------------------------------------------------
// Neutral format  →  OpenAI format
// ---------------------------------------------------------------

export function toOpenAIMessage(
  message: AgentMessage
): ChatCompletionMessageParam {
  switch (message.role) {
    case "tool":
      return {
        role: "tool",
        tool_call_id: message.tool_call_id,
        content: message.content,
      };

    case "assistant":
      if ("tool_calls" in message) {
        return {
          role: "assistant",
          content: message.content || null,
          tool_calls: message.tool_calls.map((call) => ({
            id: call.id,
            type: "function",
            function: {
              name: call.name,
              arguments: JSON.stringify(call.arguments),
            },
          })),
        };
      }

      return { role: "assistant", content: message.content };

    case "system":
      return { role: "system", content: message.content };

    default:
      return { role: "user", content: message.content };
  }
}

function toOpenAITool(tool: LLMToolDefinition): ChatCompletionTool {
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
// OpenAI format  →  Neutral format
// ---------------------------------------------------------------

function toLLMToolCall(
  toolCall: ChatCompletionMessageToolCall
): LLMToolCall {
  if (toolCall.type !== "function") {
    throw new Error(`Unsupported tool call type: ${toolCall.type}`);
  }

  return {
    id: toolCall.id,
    name: toolCall.function.name,
    arguments: parseArguments(toolCall.function.arguments),
  };
}

function parseArguments(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);

    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}