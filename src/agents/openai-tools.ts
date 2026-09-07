import { toolRegistry } from "./tool-registry";

export const openAITools = [
  {
    type: "function" as const,
    name: "create_task",
    description: toolRegistry.create_task.description,
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
    description: toolRegistry.list_tasks.description,
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },

  {
    type: "function" as const,
    name: "complete_task",
    description: toolRegistry.complete_task.description,
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The ID of the task",
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
    description: toolRegistry.delete_task.description,
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The ID of the task",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    strict: true,
  },
];