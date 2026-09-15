import {
  createConversation,
  getConversation,
  saveConversation,
} from "../repositories/conversation-repository";

import type { AgentState } from "./agent-state";

export async function createAgentState(): Promise<AgentState> {
  const conversation = await createConversation();

  return {
    conversationId: conversation.id,
    conversation: conversation.messages,
    summary: conversation.summary,
  };
}

export async function loadAgentState(
  conversationId: string
): Promise<AgentState | null> {
  const conversation =
    await getConversation(conversationId);

  if (!conversation) {
    return null;
  }

  return {
    conversationId: conversation.id,
    conversation: conversation.messages,
    summary: conversation.summary,
  };
}

export async function persistAgentState(
  state: AgentState
): Promise<void> {
  await saveConversation({
    id: state.conversationId,
    messages: state.conversation,
    summary: state.summary,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}