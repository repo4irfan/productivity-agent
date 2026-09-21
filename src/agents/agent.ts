import { executeTool } from "./tool-router";
import { toolDefinitions } from "./tool-definitions";
import { getLLMClient } from "../llm";

import { extractMemory } from "../memory/memory-extractor";
import { remember } from "../tools/memory-tools";
import { persistAgentState } from "./conversation-manager";
import { manageConversationContext } from "./context-manager";
import {
  retrieveRelevantMemories,
  formatMemoryContext,
} from "../memory/memory-retriever";

import type { AgentState, AgentMessage } from "./agent-state";

export async function runAgent(
  state: AgentState,
  latestMessage: string
) {
  // --------------------------------
  // 1. Extract useful memory
  // --------------------------------

  const memoryResult = await extractMemory(latestMessage);

  if (memoryResult.shouldRemember && memoryResult.memory) {
    const saved = await remember(memoryResult.memory);

    console.log(
      saved.created ? "Memory saved:" : "Memory already known:",
      saved.memory.content
    );
  }

    // --------------------------------
  // 1b. Retrieve relevant memories
  // --------------------------------

  const relevantMemories = await retrieveRelevantMemories(latestMessage);

  if (relevantMemories.length > 0) {
    console.log(
      "Relevant memories:",
      relevantMemories.map((memory) => memory.content)
    );
  }

  const memoryContext = formatMemoryContext(relevantMemories);

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
  
    const system = `
You are a productivity assistant.

You can:
- Create tasks
- Update a task's title, priority, or due date
- List tasks, filtered by status, priority, or due date (overdue, today, this week)
- Find tasks by title
- Complete tasks
- Give a daily briefing and recommend what to work on.
- Delete tasks
- Remember information
- Search remembered information
- Search the user's documents

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
- To change a task, find its ID with find_tasks, then call update_task
  with only the fields that change. Use clearDueDate to remove a due date.
- Use search_memory when relevant remembered information is needed.
- Give concise natural-language responses.
- When the user mentions a due date (e.g. "tomorrow", "next Friday", "Sept 25"),
  convert it to YYYY-MM-DD using today's date and pass it as dueDate.
- When the user mentions urgency or importance, set priority accordingly.
- When the user asks what is overdue, due today, or due this week, call
  list_tasks with the matching "due" filter. Do not compare dates yourself.
- When the user asks for "my tasks" without qualification, call list_tasks
  with no filters (open tasks only).
- When the user asks what to work on, what to focus on, or for a plan for
  the day, call get_daily_briefing. Then recommend an order:
  overdue first, then due today, then high priority, then due this week.
  A task may appear in more than one list; mention it once.
- If nothing is overdue or due today, say so and suggest the highest-priority
  open tasks instead.
- Relevant memories are shown under "What you know about the user". Use them
  directly when answering. Call search_memory only when the user asks about
  something not shown there.
- Useful facts the user states about themselves are remembered automatically.
  Do not ask permission to remember, and do not offer to remember.
  Only call remember when the user explicitly asks you to remember something.
- When the user asks about the contents of their notes, documents, or files,
  call search_documents and answer ONLY from the returned passages. Mention
  which document the answer came from. If nothing relevant is returned, say
  you couldn't find it in their documents — do not answer from general knowledge.
- Use read_document when the question asks for steps, a checklist, a list,
  a summary, or "everything" in a document. Use search_documents only for
  one specific fact. search_documents returns at most 4 passages, so it can
  never give a complete list.
- Always search or read for a new question, even if earlier results are still
  in the conversation.

Calendar (use this to convert relative dates to YYYY-MM-DD — do not calculate dates yourself):
${buildCalendarContext()}
${summaryContext}
`;

  // --------------------------------
  // 5. Agent tool-calling loop
  // --------------------------------

let emptyResponseRetries = 0;
const MAX_EMPTY_RESPONSE_RETRIES = 2;

let toolLoopCount = 0;
const MAX_TOOL_LOOPS = 5;

const llm = getLLMClient();

while (true) {

    toolLoopCount++;

    if (toolLoopCount > MAX_TOOL_LOOPS) {
      return failGracefully(
        state,
        "Exceeded the maximum number of tool execution steps."
      );
    }

    const response = await llm.chat({
      system,
      messages: withContextInLastUserMessage(state.conversation, memoryContext),
      tools: toolDefinitions,
    });

    if (response.toolCalls.length === 0) {
      const content = response.content.trim();

      if (!content) {
        emptyResponseRetries++;

        console.warn(
          `LLM returned an empty response. Retry ${emptyResponseRetries}/${MAX_EMPTY_RESPONSE_RETRIES}`
        );

        if (emptyResponseRetries >= MAX_EMPTY_RESPONSE_RETRIES) {
          return failGracefully(
            state,
            "LLM returned an empty response after multiple retries."
          );
        }

        continue;
      }

      state.conversation.push({ role: "assistant", content });

      await persistAgentState(state);

      return content;
    }

    state.conversation.push({
      role: "assistant",
      content: response.content,
      tool_calls: response.toolCalls,
    });

    await persistAgentState(state);

    for (const toolCall of response.toolCalls) {
      const toolArguments = JSON.stringify(toolCall.arguments);

      console.log("\nTool requested:", toolCall.name);
      console.log("Arguments:", toolArguments);

      const result = await executeTool(toolCall.name, toolArguments);

      console.log("Tool result:", JSON.stringify(result, null, 2));

      state.conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        tool_name: toolCall.name,
        content: JSON.stringify(result),
      });

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

// Per-turn context goes into the latest user message rather than the
// system prompt, so the cached prefix (system + earlier history) survives.
// Applied at send time only — the stored conversation stays clean.
function withContextInLastUserMessage(
  messages: AgentMessage[],
  context: string
): AgentMessage[] {
  if (!context) {
    return messages;
  }

  const index = messages.findLastIndex((message) => message.role === "user");

  if (index === -1) {
    return messages;
  }

  return messages.map((message, i) =>
    i === index && message.role === "user"
      ? { ...message, content: `${context}\n${message.content}` }
      : message
  );
}