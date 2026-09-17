import { z } from "zod";

import {
  createTask,
  listTasks,
  findTasks,
  completeTask,
  deleteTask,
} from "../tools/task-tools";

import {
  remember,
  getMemories,
  searchMemory
} from "../tools/memory-tools";

import type { AgentTool } from "./tool-types";


const createTaskTool: AgentTool<
  {
    title: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
  },
  Awaited<ReturnType<typeof createTask>>
> = {
  name: "create_task",

  description:
    "Create a new productivity task with an optional priority and due date.",

  schema: z.object({
    title: z.string().min(1),
    priority: z.enum(["low", "medium", "high"]).optional(),
    dueDate: z.iso.date().nullable().optional(),
  }),

  openAISchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title of the task",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Task priority. Defaults to medium.",
      },
      dueDate: {
        type: "string",
        description:
          "Due date in YYYY-MM-DD format. Omit if the user gave no due date.",
      },
    },
    required: ["title"],
    additionalProperties: false,
  },

  execute: async (input) => createTask(input),
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

const findTasksTool: AgentTool<
  { query: string },
  Awaited<ReturnType<typeof findTasks>>
> = {
  name: "find_tasks",

  description:
    "Find tasks whose title contains the given text. Use this to look up a task's ID when the user refers to it by name.",

  schema: z.object({
    query: z.string().min(1),
  }),

  openAISchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Text to search for in task titles (case-insensitive).",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },

  execute: async ({ query }) => findTasks(query),
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

const searchMemoryTool: AgentTool<
  { query: string },
  Awaited<ReturnType<typeof searchMemory>>
> = {
  name: "search_memory",

  description:
    "Search the user's stored memories for information relevant to a query.",

  schema: z.object({
    query: z.string().min(1),
  }),

  openAISchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The information to search for in user memories.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },

  execute: async ({ query }) => searchMemory(query),
};

export const toolRegistry = {
  create_task: createTaskTool,
  list_tasks: listTasksTool,
  find_tasks: findTasksTool,
  complete_task: completeTaskTool,
  delete_task: deleteTaskTool,

  remember: rememberTool,
  get_memories: getMemoriesTool,
  search_memory: searchMemoryTool,
};