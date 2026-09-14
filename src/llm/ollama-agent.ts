import ollama from "ollama";

import { ollamaTools } from "./ollama-tools";
import { executeTool } from "../agents/tool-router";

import { extractMemory } from "../memory/memory-extractor";
import { remember } from "../tools/memory-tools";

import type { AgentState } from "../agents/agent-state";

import { persistAgentState } from "../agents/conversation-manager";

const MODEL = "qwen2.5:7b";

export async function ollamaAgent(
  state: AgentState,
  latestMessage: string
) {
  // --------------------------------
  // 1. Extract useful memory
  // --------------------------------

  const memoryResult = await extractMemory(latestMessage);

  const memoryWasSaved =
    memoryResult.shouldRemember && !!memoryResult.memory;

  if (memoryWasSaved && memoryResult.memory) {
    await remember(memoryResult.memory);

    console.log(
      "Memory saved:",
      memoryResult.memory
    );
  }

  // --------------------------------
  // 2. Start agent conversation
  // --------------------------------
  state.conversation.push({
    role: "user",
    content: latestMessage,
  });

const messages: ollama.Message[] = [
  {
    role: "system",
    content: `
You are a productivity assistant.

You can:
- Create tasks
- List tasks
- Complete tasks
- Delete tasks
- Remember information
- Search remembered information

Rules:
- Use tools when an action requires accessing or modifying data.
- Never claim an action was completed unless the corresponding
  tool successfully completed it.
- Use list_tasks when the user asks about existing tasks.
- Use complete_task when the user wants to complete a task.
- Use delete_task when the user wants to delete a task.
- Use search_memory when relevant remembered information is needed.
- Give concise natural-language responses.
`,
  },

  ...state.conversation,
];

  // --------------------------------
  // 3. Agent tool-calling loop
  // --------------------------------

  while (true) {
    const response = await ollama.chat({
      model: MODEL,
      messages,
      tools: ollamaTools,
    });

    messages.push(response.message);

    // No tool call → final answer
    if (!response.message.tool_calls?.length) {
      state.conversation.push({
        role: "assistant",
        content: response.message.content,
      });

      await persistAgentState(state);

      return response.message.content;
    }

    // Execute requested tools
    for (const toolCall of response.message.tool_calls) {
      const toolName = toolCall.function.name;

      const toolArguments = JSON.stringify(
        toolCall.function.arguments
      );

      console.log("\nTool requested:", toolName);
      console.log("Arguments:", toolArguments);

      const result = await executeTool(
        toolName,
        toolArguments
      );

      console.log("Tool result:", result);

      const toolMessage = {
        role: "tool" as const,
        tool_name: toolName,
        content: JSON.stringify(result),
      };

      messages.push(toolMessage);
      state.conversation.push(toolMessage);

      await persistAgentState(state);
    }
  }
}