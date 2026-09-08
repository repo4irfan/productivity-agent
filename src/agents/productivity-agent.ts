import OpenAI from "openai";

import { executeTool } from "./tool-router";
import { openAITools } from "./openai-tools";
import type { AgentState } from "./agent-state";

import { extractMemory } from "../memory/memory-extractor";
import { remember } from "../tools/memory-tools";

const client = new OpenAI();

export async function productivityAgent(
  state: AgentState,
  latestMessage: string
) {

  const memoryResult = await extractMemory(latestMessage);
  const memoryWasSaved =
  memoryResult.shouldRemember && !!memoryResult.memory;

  if (memoryResult.shouldRemember && memoryResult.memory) {
    await remember(memoryResult.memory);

    console.log(
      "Memory saved:",
      memoryResult.memory
    );
  }
  
  const input = state.conversation;
  
  while (true) {
    const response = await client.responses.create({
      model: "gpt-5-mini",

      instructions: `
You are a productivity assistant.

You can:
- Create tasks
- List tasks
- Complete tasks
- Delete tasks
- Remember useful information
- Retrieve remembered information

Memory behavior:
- The application automatically extracts useful long-term information
  from the user's message before you run.
- Memory was automatically saved for this message:
  ${memoryWasSaved}
- If memory was automatically saved, do NOT ask the user whether they
  want it saved.
- Simply acknowledge it naturally.
- Only use the remember tool when the user explicitly asks you to
  remember something that has not already been saved.
- Never claim an action was completed unless the corresponding tool
  successfully completed it.
`,

      tools: openAITools,
      input,
    });

    const functionCall = response.output.find(
      (item) => item.type === "function_call"
    );

    // Agent has finished
    if (!functionCall) {
      input.push({
        role: "assistant",
        content: response.output_text,
      });

      return response.output_text;
    }

    console.log("Tool requested:", functionCall.name);
    console.log("Arguments:", functionCall.arguments);

    const result = await executeTool(
      functionCall.name,
      functionCall.arguments
    );

    console.log("Tool result:", result);

    // Preserve the model's tool call
    input.push(...response.output);

    // Add the tool result
    input.push({
      type: "function_call_output",
      call_id: functionCall.call_id,
      output: JSON.stringify(result),
    });
  }
}