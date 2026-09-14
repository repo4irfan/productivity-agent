import { ollamaAgent } from "./llm/ollama-agent";
import { createAgentState } from "./agents/conversation-manager";
import readline from "node:readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  const state = await createAgentState();

  console.log(`Conversation ID: ${state.conversationId}`);

  try {
    while (true) {
      const message = await rl.question("You: ");

      const trimmedMessage = message.trim();

      if (!trimmedMessage) {
        continue;
      }

      if (trimmedMessage.toLowerCase() === "exit") {
        break;
      }

      const response = await ollamaAgent(
        state,
        trimmedMessage
      );

      console.log("Agent:", response);
    }
  } finally {
    rl.close();
  }

  console.log("Goodbye!");
}

main().catch((error) => {
  console.error("Application error:", error);
  process.exitCode = 1;
});