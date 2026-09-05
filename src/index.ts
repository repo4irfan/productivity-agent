import "dotenv/config";
import readline from "node:readline/promises";
import { productivityAgent } from "./agents/productivity-agent";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {

    const conversation: any[] = [];
    
    while (true) {
        const message = await rl.question("You: ");

        if (message.toLowerCase() === "exit") {
            break;
        }

        conversation.push({
            role: "user",
            content: message,
        });

        const response = await productivityAgent(conversation);

        console.log("Agent:", response);
    }

  rl.close();
}

main();