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

import {
  readDocument,
  searchDocuments,
  listDocuments
} from "../tools/document-tools";

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
    id?: string | null;
    title?: string | null;
    newTitle?: string | null;
    priority?: "low" | "medium" | "high" | null;
    dueDate?: string | null;
    clearDueDate?: boolean | null;
  },
  Awaited<ReturnType<typeof updateTask>>
> = {
  name: "update_task",

  description:
    "Change a task's priority, due date, or name. Identify the task by `id`, or by `title` if you don't have the id. Use `newTitle` to rename it. Only include the fields that should change.",

  schema: z.object({
    id: z.string().uuid().nullable().optional(),
    title: z.string().min(1).nullable().optional(),
    newTitle: z.string().min(1).nullable().optional(),
    priority: z.enum(["low", "medium", "high"]).nullable().optional(),
    dueDate: z.iso.date().nullable().optional(),
    clearDueDate: z.boolean().nullable().optional(),
  }),

  openAISchema: {
    type: "object",
    properties: {
      id: {
        type: ["string", "null"],
        description: "The ID of the task to update, if known.",
      },
      title: {
        type: ["string", "null"],
        description: "The task's current title, used to find it when the ID is not known.",
      },
      newTitle: {
        type: ["string", "null"],
        description: "New name for the task. Only set this when renaming.",
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
    required: [],
    additionalProperties: false,
  },

  execute: async (reference) => updateTask(reference),
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
    "List tasks, optionally filtered by status, priority, or due date (overdue, today, this week). By default returns only open tasks.",

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
    "Search tasks by title text and return the matches. Use only to answer questions like \"do I have a task about X?\" or to list matching tasks. Do NOT call this before complete_task, delete_task, or update_task — those accept a title directly.",

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
  { id?: string | null; title?: string | null },
  Awaited<ReturnType<typeof completeTask>>
> = {
  name: "complete_task",
  description:
    "Mark a task as completed. Give its id, or its title if you don't have the id.",
  schema: z.object({
    id: z.string().uuid().nullable().optional(),
    title: z.string().min(1).nullable().optional(),
  }),
  openAISchema: {
    type: "object",
    properties: {
      id: { type: ["string", "null"], description: "The task id, if known." },
      title: { type: ["string", "null"], description: "The task title, if the id is not known." },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (reference) => completeTask(reference),
};

const deleteTaskTool: AgentTool<
  { id?: string | null; title?: string | null },
  Awaited<ReturnType<typeof deleteTask>>
> = {
  name: "delete_task",

  
  description:
    "Permanently delete a task. This cannot be undone. Give its id, or its title if you don't have the id.",
  schema: z.object({
    id: z.string().uuid().nullable().optional(),
    title: z.string().min(1).nullable().optional(),
  }),

  openAISchema: {
    type: "object",
    properties: {
      id: { type: ["string", "null"], description: "The task id, if known." },
      title: { type: ["string", "null"], description: "The task title, if the id is not known." },
    },
    required: [],
    additionalProperties: false,
  },

  execute: async (reference) => {
    return deleteTask(reference);
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
    "Most facts are saved automatically; call this only when the user explicitly asks you to remember something.",

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
    "List everything remembered about the user. Use only when the user asks what you remember about them; for a specific fact, use search_memory.",

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

const readDocumentTool: AgentTool<
  { title: string },
  Awaited<ReturnType<typeof readDocument>>
> = {
  name: "read_document",
  description:
    "Read an entire document, in order. Use for questions like 'what are my deployment steps', 'summarize my notes', or anything asking for all items in a document.",
  schema: z.object({ title: z.string().min(1) }),
  openAISchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The document title (or part of it), as shown by list_documents.",
      },
    },
    required: ["title"],
    additionalProperties: false,
  },
  execute: async ({ title }) => readDocument(title),
};

const searchDocumentsTool: AgentTool<{ query: string }, Awaited<ReturnType<typeof searchDocuments>>> = {
  name: "search_documents",
  description:
    "Search the user's ingested documents and notes for a specific fact, and return the most relevant passages with their document titles.",
  schema: z.object({ query: z.string().min(1) }),
  openAISchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "What to look for, in natural language." },
    },
    required: ["query"],
    additionalProperties: false,
  },
  execute: async ({ query }) => searchDocuments(query),
};

const listDocumentsTool: AgentTool<Record<string, never>, Awaited<ReturnType<typeof listDocuments>>> = {
  name: "list_documents",
  description: "List the documents the user has ingested.",
  schema: z.object({}),
  openAISchema: { type: "object", properties: {}, required: [], additionalProperties: false },
  execute: async () => listDocuments(),
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

  read_document: readDocumentTool,
  search_documents: searchDocumentsTool,
  list_documents: listDocumentsTool
};