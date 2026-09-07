import { z } from "zod";

import {
  createTask,
  listTasks,
  completeTask,
  deleteTask,
} from "../tools/task-tools";

import {
  remember,
  getMemories,
} from "../tools/memory-tools";

import type { AgentTool } from "./tool-types";


const createTaskTool: AgentTool<
  { title: string },
  Awaited<ReturnType<typeof createTask>>
> = {
  name: "create_task",

  description: "Create a new productivity task.",

  schema: z.object({
    title: z.string().min(1),
  }),

  openAISchema: {
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

  execute: async ({ title }) => {
    return createTask(title);
  },
};

const listTasksTool: AgentTool<
  Record<string, never>,
  Awaited<ReturnType<typeof listTasks>>
> = {
  name: "list_tasks",

  description: "List all productivity tasks.",

  schema: z.object({}),

  openAISchema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },

  execute: async () => {
    return listTasks();
  },
};

const completeTaskTool: AgentTool<
  { id: string },
  Awaited<ReturnType<typeof completeTask>>
> = {
  name: "complete_task",

  description: "Mark a productivity task as completed.",

  schema: z.object({
    id: z.string().uuid(),
  }),

  openAISchema: {
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

  execute: async ({ id }) => {
    return completeTask(id);
  },
};

const deleteTaskTool: AgentTool<
  { id: string },
  Awaited<ReturnType<typeof deleteTask>>
> = {
  name: "delete_task",

  description: "Delete a productivity task.",

  schema: z.object({
    id: z.string().uuid(),
  }),

  openAISchema: {
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

  execute: async ({ id }) => {
    return deleteTask(id);
  },
};

const rememberTool: AgentTool<
  { content: string },
  Awaited<ReturnType<typeof remember>>
> = {
  name: "remember",

  description:
    "Save a useful piece of information about the user for future conversations.",

  schema: z.object({
    content: z.string().min(1),
  }),

  openAISchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description:
          "The useful information that should be remembered.",
      },
    },
    required: ["content"],
    additionalProperties: false,
  },

  execute: async ({ content }) => {
    return remember(content);
  },
};

const getMemoriesTool: AgentTool<
  Record<string, never>,
  Awaited<ReturnType<typeof getMemories>>
> = {
  name: "get_memories",

  description:
    "Retrieve information previously remembered about the user.",

  schema: z.object({}),

  openAISchema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },

  execute: async () => {
    return getMemories();
  },
};

export const toolRegistry = {
  create_task: createTaskTool,
  list_tasks: listTasksTool,
  complete_task: completeTaskTool,
  delete_task: deleteTaskTool,

  remember: rememberTool,
  get_memories: getMemoriesTool,
};