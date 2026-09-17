import {
  createTask as createTaskInDb,
  listTasks as listTasksFromDb,
  findTasks as findTasksInDb,
  completeTask as completeTaskInDb,
  deleteTask as deleteTaskFromDb,
} from "../repositories/task-repository";

import { ToolError } from "../agents/tool-error";

import type {
  Task,
  Priority,
  CreateTaskInput,
  TaskFilter,
} from "../repositories/task-repository";

export type { Task, Priority, CreateTaskInput, TaskFilter };

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return createTaskInDb(input);
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