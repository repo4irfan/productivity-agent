import "dotenv/config";
import { runAgent } from "./agents/agent";
import {
  createAgentState,
  loadAgentState,
} from "./agents/conversation-manager";

import { runTurn } from "./observability/tracer";
import { saveTrace } from "./observability/trace-repository";
import { summarizeTrace } from "./observability/trace-summary";

import readline from "node:readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  try {
    const existingConversationId = await rl.question(
      "Conversation ID (press Enter for new): "
    );

    let state;

    if (existingConversationId.trim()) {
      const existingState = await loadAgentState(
        existingConversationId.trim()
      );

      if (!existingState) {
        console.log(
          "Conversation not found. Creating a new conversation."
        );

        state = await createAgentState();
      } else {
        state = existingState;

        console.log(
          `Resumed conversation: ${state.conversationId}`
        );
      }
    } else {
      state = await createAgentState();

      console.log(
        `Created conversation: ${state.conversationId}`
      );
    }

    while (true) {
      const message = await rl.question("You: ");

      const trimmedMessage = message.trim();

      if (!trimmedMessage) {
        continue;
      }

      if (trimmedMessage.toLowerCase() === "exit") {
        break;
      }

      try {
        
        const response = await runTurn(
          state.conversationId,
          trimmedMessage,
          () => runAgent(state, trimmedMessage),
          async (trace) => {
            console.log(summarizeTrace(trace));
            await saveTrace(trace);
          }
        );

        console.log("Agent:", response);
      } catch (error) {
        console.error("Unexpected error:", error);

        console.log(
          "Agent: Something went wrong. Please try again."
        );
      }
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