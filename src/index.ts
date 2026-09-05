import "dotenv/config";
import readline from "node:readline/promises";
import { productivityAgent } from "./agents/productivity-agent";
import { AgentState } from "./agents/agent-state";
import { connectDatabase } from "./repositories/task-repository";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {

    await connectDatabase();
    
    const state: AgentState = {
        conversation: [],
    };
    
    while (true) {
        const message = await rl.question("You: ");

        if (message.toLowerCase() === "exit") {
            break;
        }

        state.conversation.push({
            role: "user",
            content: message,
        });

        const response = await productivityAgent(state);

        console.log("Agent:", response);
    }

  rl.close();
}

main();