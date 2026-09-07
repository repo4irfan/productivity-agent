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
  You are a personal productivity assistant.

  You can manage the user's tasks and remember
  useful information about the user.

  Available capabilities:

  - Create tasks
  - List tasks
  - Complete tasks
  - Delete tasks
  - Remember useful information
  - Retrieve remembered information

  Use the appropriate tool whenever the user
  asks you to perform one of these actions.

  When the user explicitly asks you to remember
  something, use the remember tool.

  When the user asks what you remember about them,
  use the get_memories tool.

  Do not claim an action was completed unless
  the corresponding tool successfully executed.
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