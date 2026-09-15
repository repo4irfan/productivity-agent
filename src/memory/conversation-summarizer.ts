import ollama from "ollama";

import type { AgentMessage } from "../agents/agent-state";

const MODEL = "qwen2.5:7b";

export async function summarizeConversation(
  messages: AgentMessage[]
): Promise<string> {
  const conversationText = messages
    .map(
      (message) =>
        `${message.role}: ${message.content}`
    )
    .join("\n");

  const response = await ollama.chat({
    model: MODEL,

    messages: [
      {
        role: "system",
        content: `
You summarize conversations for a productivity assistant.

Create a concise summary containing information that
is useful for continuing the conversation.

Preserve:
- Important decisions
- User requests
- Important task context
- References that may be needed later
- Relevant user preferences mentioned in the conversation

Do not include unnecessary conversational details.

Return only the summary text.
`,
      },
      {
        role: "user",
        content: conversationText,
      },
    ],
  });

  return response.message.content.trim();
}