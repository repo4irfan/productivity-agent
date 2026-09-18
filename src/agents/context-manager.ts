import type { AgentState } from "./agent-state";
import { summarizeConversation } from "../memory/conversation-summarizer";
import type { AgentMessage } from "./agent-state";

const MAX_MESSAGES = 20;
const KEEP_MESSAGES = 10;

export async function manageConversationContext(
  state: AgentState
): Promise<void> {
  if (state.conversation.length <= MAX_MESSAGES) {
    return;
  }

  const cutIndex = findSafeCutIndex(
    state.conversation,
    state.conversation.length - KEEP_MESSAGES
  );

  const oldMessages = state.conversation.slice(0, cutIndex);
  const recentMessages = state.conversation.slice(cutIndex);

  const newSummary =
  await summarizeConversation(
    oldMessages,
    state.summary
  );

  state.summary = newSummary;

  state.conversation = recentMessages;
}

// Walk backwards from the ideal cut until we land on a user message, so a
// tool-call / tool-result pair is never split across summary and history.
function findSafeCutIndex(
  messages: AgentMessage[],
  ideal: number
): number {
  for (let i = ideal; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      return i;
    }
  }

  return 0;
}