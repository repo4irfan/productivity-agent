import ollama from "ollama";

import { ollamaTools } from "./ollama-tools";
import { executeTool } from "../agents/tool-router";

import { extractMemory } from "../memory/memory-extractor";
import { remember } from "../tools/memory-tools";

import type { AgentState } from "../agents/agent-state";

import {
  persistAgentState,
} from "../agents/conversation-manager";

import {
  manageConversationContext,
} from "../agents/context-manager";

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
    memoryResult.shouldRemember &&
    !!memoryResult.memory;

  if (memoryWasSaved && memoryResult.memory) {
    await remember(memoryResult.memory);

    console.log(
      "Memory saved:",
      memoryResult.memory
    );
  }

  // --------------------------------
  // 2. Add user message to state
  // --------------------------------

  state.conversation.push({
    role: "user",
    content: latestMessage,
  });

  // --------------------------------
  // 3. Manage conversation context
  // --------------------------------

  await manageConversationContext(state);

  await persistAgentState(state);

  // --------------------------------
  // 4. Build model context
  // --------------------------------

  const summaryContext = state.summary
    ? `
Previous conversation summary:
${state.summary}
`
    : "";

  const messages: ollama.Message[] = [
    {
      role: "system",
      content: `
You are a productivity assistant.

You can:
- Create tasks
- List tasks, filtered by status, priority, or due date (overdue, today, this week)
- Find tasks by title
- Complete tasks
- Delete tasks
- Remember information
- Search remembered information

Rules:
- Use tools when an action requires accessing or modifying data.
- Every tool returns JSON with a "success" field.
  - If "success" is true, the operation happened. Report it using the "data".
  - If "success" is false, the operation DID NOT happen. Tell the user it
    failed and repeat the "error" text. Never say a task was created,
    completed, or deleted, or that a memory was saved, when "success" is false.
- Never invent task IDs. Only use IDs returned by list_tasks, find_tasks, or create_task.
- If the user refers to a task by title, call find_tasks with that title
  to get its ID. Do not use list_tasks for this.
- If find_tasks returns more than one match, do NOT guess. Show the user
  the matches and ask which one they mean.
- If find_tasks returns no matches, say the task was not found.
- Use search_memory when relevant remembered information is needed.
- Give concise natural-language responses.
- When the user mentions a due date (e.g. "tomorrow", "next Friday", "Sept 25"),
  convert it to YYYY-MM-DD using today's date and pass it as dueDate.
- When the user mentions urgency or importance, set priority accordingly.
- When the user asks what is overdue, due today, or due this week, call
  list_tasks with the matching "due" filter. Do not compare dates yourself.
- When the user asks for "my tasks" without qualification, call list_tasks
  with no filters (open tasks only).

Calendar (use this to convert relative dates to YYYY-MM-DD — do not calculate dates yourself):
${buildCalendarContext()}
${summaryContext}
`,
    },

    ...state.conversation,
  ];

  // --------------------------------
  // 5. Agent tool-calling loop
  // --------------------------------

let emptyResponseRetries = 0;
const MAX_EMPTY_RESPONSE_RETRIES = 2;

let toolLoopCount = 0;
const MAX_TOOL_LOOPS = 5;

while (true) {

    toolLoopCount++;

    if (toolLoopCount > MAX_TOOL_LOOPS) {
      return failGracefully(
        state,
        "Exceeded the maximum number of tool execution steps."
      );
    }

    const response = await ollama.chat({
      model: MODEL,
      messages,
      tools: ollamaTools,
      options: { num_ctx: 8192 },
    });

    console.log(
      "Ollama response:",
      JSON.stringify(response, null, 2)
    );

    if (!response.message.tool_calls?.length) {
      const content = response.message.content.trim();

      if (!content) {
        emptyResponseRetries++;

        console.warn(
          `Ollama returned an empty response. Retry ${emptyResponseRetries}/${MAX_EMPTY_RESPONSE_RETRIES}`
        );

        if (
          emptyResponseRetries >=
          MAX_EMPTY_RESPONSE_RETRIES
        ) {
          return failGracefully(
            state,
            "Ollama returned an empty response after multiple retries."
          );
        }

        continue;
      }

      messages.push(response.message);

      state.conversation.push({
        role: "assistant",
        content,
      });

      await persistAgentState(state);

      return content;
    }

    messages.push(response.message);

    state.conversation.push({
      role: "assistant",
      content: response.message.content,
      tool_calls: response.message.tool_calls.map(
        (toolCall) => ({
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        })
      ),
    });

    await persistAgentState(state);

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

async function failGracefully(
  state: AgentState,
  reason: string
): Promise<string> {
    console.error("Agent failure:", reason);

    const content =
      "I ran into a problem and couldn't finish that request. Please try again.";

    state.conversation.push({
      role: "assistant",
      content,
    });

    await persistAgentState(state);

    return content;
}

function buildCalendarContext(): string {
  const lines: string[] = [];

  for (let offset = 0; offset < 14; offset++) {
    const date = new Date();
    date.setDate(date.getDate() + offset);

    const iso = date.toLocaleDateString("en-CA");
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });

    const label =
      offset === 0 ? "today" : offset === 1 ? "tomorrow" : `in ${offset} days`;

    lines.push(`${iso} = ${weekday} (${label})`);
  }

  return lines.join("\n");
}