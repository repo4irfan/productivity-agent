import type { AgentMessage } from "../agents/agent-state";
import { getLLMClient } from "../llm";

export async function summarizeConversation(
  messages: AgentMessage[],
  existingSummary?: string
): Promise<string> {
  const conversationText = messages
    .map(
      (message) =>
        `${message.role}: ${message.content}`
    )
    .join("\n");

  const existingSummaryText = existingSummary
    ? `
Existing conversation summary:
${existingSummary}
`
    : "";


    const response = await getLLMClient().chat({
      purpose: "summarization",
    system: `
You summarize conversations for a productivity assistant.

Create ONE concise, updated summary of the conversation.

You may receive:
1. An existing summary
2. Older conversation messages

Combine them into a single improved summary.

Preserve:
- Important decisions
- User requests
- Important task context
- References needed to continue the conversation
- Relevant user preferences
- Important unresolved issues

Remove:
- Repeated information
- Greetings
- Small talk
- Temporary conversational details
- Information that is no longer useful

Do not mention that you are creating or updating a summary.

Return only the final summary text.
`,
    messages: [
      {
        role: "user",
        content: `
${existingSummaryText}

Older conversation messages:
${conversationText}
`,
      },
    ],
  });

  return response.content.trim();
}