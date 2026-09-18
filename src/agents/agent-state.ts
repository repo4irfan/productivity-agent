export type AgentToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type AgentMessage =
  | {
      role: "system" | "user" | "assistant";
      content: string;
    }
  | {
      role: "assistant";
      content: string;
      tool_calls: AgentToolCall[];
    }
  | {
      role: "tool";
      tool_call_id: string;
      tool_name: string;
      content: string;
    };

export type AgentState = {
  conversationId: string;
  conversation: AgentMessage[];
  summary?: string;
};