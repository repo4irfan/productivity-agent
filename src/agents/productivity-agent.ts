import OpenAI from "openai";

import { executeTool } from "./tool-router";
import { openAITools } from "./openai-tools";
import type { AgentState } from "./agent-state";

import { extractMemory } from "../memory/memory-extractor";
import { remember, getMemories } from "../tools/memory-tools";

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
You are a productivity assistant.

You can:
- Create tasks
- List tasks
- Complete tasks
- Delete tasks
- Remember useful information
- Retrieve remembered information

Memory behavior:
- Useful long-term information may be automatically saved.
- Do not ask the user whether automatically extracted information
  should be saved.
- Do NOT call the remember tool for information that was already
  automatically saved.
- Use the search_memory tool when stored memories may be relevant
  to the user's request.
- Use the get_memories tool when the user asks what you remember
  about them.
- Never claim an action was completed unless the corresponding
  tool successfully completed it.
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