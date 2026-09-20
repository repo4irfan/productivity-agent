import { z } from "zod";

import {
  createTask,
  updateTask,
  listTasks,
  findTasks,
  completeTask,
  deleteTask,
  getDailyBriefing,
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
    dueDate?: string | null;
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

const updateTaskTool: AgentTool<
  {
    id: string;
    title?: string | null;
    priority?: "low" | "medium" | "high" | null;
    dueDate?: string | null;
    clearDueDate?: boolean | null;
  },
  Awaited<ReturnType<typeof updateTask>>
> = {
  name: "update_task",

  description:
    "Change a task's title, priority, or due date. Only include the fields that should change.",

  schema: z.object({
    id: z.string().uuid(),
    title: z.string().min(1).nullable().optional(),
    priority: z.enum(["low", "medium", "high"]).nullable().optional(),
    dueDate: z.iso.date().nullable().optional(),
    clearDueDate: z.boolean().nullable().optional(),
  }),

  openAISchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The ID of the task to update.",
      },
      title: {
        type: ["string", "null"],
        description: "New title, or null to leave unchanged.",
      },
      priority: {
        type: ["string", "null"],
        enum: ["low", "medium", "high", null],
        description: "New priority, or null to leave unchanged.",
      },
      dueDate: {
        type: ["string", "null"],
        description: "New due date in YYYY-MM-DD, or null to leave unchanged.",
      },
      clearDueDate: {
        type: ["boolean", "null"],
        description: "true to remove the due date.",
      },
    },
    required: ["id"],
    additionalProperties: false,
  },

  execute: async (input) => updateTask(input),
};

const listTasksTool: AgentTool<
  {
    status?: "open" | "completed" | "all";
    priority?: "low" | "medium" | "high";
    due?: "overdue" | "today" | "this_week" | "no_due_date";
  },
  Awaited<ReturnType<typeof listTasks>>
> = {
  name: "list_tasks",

  description:
    "List tasks, optionally filtered. By default returns only open (incomplete) tasks.",

  schema: z.object({
    status: z.enum(["open", "completed", "all"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    due: z
      .enum(["overdue", "today", "this_week", "no_due_date"])
      .optional(),
  }),

  openAISchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["open", "completed", "all"],
        description: "Which tasks to include. Defaults to open.",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Only tasks with this priority.",
      },
      due: {
        type: "string",
        enum: ["overdue", "today", "this_week", "no_due_date"],
        description:
          "Filter by due date: overdue (past due and not completed), today, this_week (next 7 days), or no_due_date.",
      },
    },
    required: [],
    additionalProperties: false,
  },

  execute: async (filter) => listTasks(filter),
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

const getDailyBriefingTool: AgentTool<
  Record<string, never>,
  Awaited<ReturnType<typeof getDailyBriefing>>
> = {
  name: "get_daily_briefing",

  description:
    "Get an overview for planning the day: overdue tasks, tasks due today, tasks due this week, and high-priority tasks. Use this when the user asks what to work on or wants a plan.",

  schema: z.object({}),

  openAISchema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },

  execute: async () => getDailyBriefing(),
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
    "Semantic search over what is remembered about the user. Describe what you are looking for in natural language, e.g. 'when does the user like to do focused work'.",

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
  update_task: updateTaskTool,
  list_tasks: listTasksTool,
  find_tasks: findTasksTool,
  complete_task: completeTaskTool,
  delete_task: deleteTaskTool,
  get_daily_briefing: getDailyBriefingTool,

  remember: rememberTool,
  get_memories: getMemoriesTool,
  search_memory: searchMemoryTool,
};