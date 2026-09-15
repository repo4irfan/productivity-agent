export type AgentMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_name?: string;
};

export type AgentState = {
  conversationId: string;
  conversation: AgentMessage[];
  summary?: string;
};