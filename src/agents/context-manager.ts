import type { AgentState } from "./agent-state";
import { summarizeConversation } from "../memory/conversation-summarizer";

const MAX_MESSAGES = 20;
const KEEP_MESSAGES = 10;

export async function manageConversationContext(
  state: AgentState
): Promise<void> {
  if (state.conversation.length <= MAX_MESSAGES) {
    return;
  }

  const oldMessages = state.conversation.slice(
    0,
    -KEEP_MESSAGES
  );

  const recentMessages = state.conversation.slice(
    -KEEP_MESSAGES
  );

  const newSummary =
  await summarizeConversation(
    oldMessages,
    state.summary
  );

  state.summary = newSummary;

  state.conversation = recentMessages;
}