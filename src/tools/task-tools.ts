import {
  createTask as createTaskInDb,
  listTasks as listTasksFromDb,
  findTasks as findTasksInDb,
  completeTask as completeTaskInDb,
  deleteTask as deleteTaskFromDb,
} from "../repositories/task-repository";

import { ToolError } from "../agents/tool-error";

export type { Task, Priority, CreateTaskInput } from "../repositories/task-repository";

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return createTaskInDb(input);
}

export async function listTasks(): Promise<Task[]> {
  return listTasksFromDb();
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