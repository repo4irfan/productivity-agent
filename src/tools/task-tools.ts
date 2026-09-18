import {
  createTask as createTaskInDb,
  updateTask as updateTaskInDb,
  listTasks as listTasksFromDb,
  findTasks as findTasksInDb,
  completeTask as completeTaskInDb,
  deleteTask as deleteTaskFromDb,
  getDailyBriefing as getDailyBriefingFromDb,
} from "../repositories/task-repository";

import { ToolError } from "../agents/tool-error";

import type {
  Task,
  Priority,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
} from "../repositories/task-repository";

export type { Task, Priority, CreateTaskInput, TaskFilter };


export type UpdateTaskToolInput = {
  id: string;
  title?: string | null;
  priority?: Priority | null;
  dueDate?: string | null;
  clearDueDate?: boolean | null;
};

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return createTaskInDb(input);
}

export async function updateTask(
  input: UpdateTaskToolInput
): Promise<Task> {
  const changes: UpdateTaskInput = {};

  if (input.title) changes.title = input.title;
  if (input.priority) changes.priority = input.priority;
  if (input.dueDate) changes.dueDate = input.dueDate;
  if (input.clearDueDate) changes.dueDate = null;

  if (Object.keys(changes).length === 0) {
    throw new ToolError("No changes were provided.");
  }

  const task = await updateTaskInDb(input.id, changes);

  if (!task) {
    throw new ToolError("Task not found.");
  }

  return task;
}

export async function listTasks(
  filter: TaskFilter = {}
): Promise<Task[]> {
  return listTasksFromDb(filter);
}

export async function findTasks(query: string): Promise<Task[]> {
  return findTasksInDb(query);
}

export async function completeTask(id: string): Promise<Task> {
  const task = await completeTaskInDb(id);

  if (!task) {
    throw new ToolError("Task not found.");
  }

  return task;
}

export async function deleteTask(id: string): Promise<Task> {
  const task = await deleteTaskFromDb(id);

  if (!task) {
    throw new ToolError("Task not found.");
  }

  return task;
}


export async function getDailyBriefing(): Promise<DailyBriefing> {
  return getDailyBriefingFromDb();
}