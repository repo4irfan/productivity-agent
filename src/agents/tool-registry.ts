import { z } from "zod";

import {
  createTask,
  listTasks,
  completeTask,
  deleteTask,
} from "../tools/task-tools";

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

  execute: async ({ id }) => {
    return deleteTask(id);
  },
};

export const toolRegistry = {
  create_task: createTaskTool,
  list_tasks: listTasksTool,
  complete_task: completeTaskTool,
  delete_task: deleteTaskTool,
};