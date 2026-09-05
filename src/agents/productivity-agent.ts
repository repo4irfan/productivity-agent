import OpenAI from "openai";

import { executeTool } from "./tool-router";

import { AgentState } from "./agent-state";

const client = new OpenAI();

const tools = [
  {
    type: "function" as const,
    name: "create_task",
    description: "Create a new productivity task.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The title of the task",
        },
      },
      required: ["title"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function" as const,
    name: "list_tasks",
    description: "List all productivity tasks.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function" as const,
    name: "complete_task",
    description: "Mark a productivity task as completed.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The ID of the task to complete",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function" as const,
    name: "delete_task",
    description: "Delete a productivity task.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The ID of the task to delete",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    strict: true,
  },
];

export async function productivityAgent(
  state: AgentState
) {
    const input = state.conversation;
  while (true) {
    const response = await client.responses.create({
      model: "gpt-5-mini",

      instructions: `
        You are a personal productivity assistant.

        You can manage the user's tasks.

        Available capabilities:

        - Create tasks
        - List tasks
        - Complete tasks
        - Delete tasks

        Use the appropriate tool whenever the user
        asks you to perform one of these actions.

        If you need information from a tool before
        performing another action, call the appropriate
        tool first.

        Do not claim an action was completed unless
        the corresponding tool successfully executed.
      `,

      tools,
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