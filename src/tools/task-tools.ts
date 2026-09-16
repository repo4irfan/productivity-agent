import {
  createTask as createTaskInDb,
  listTasks as listTasksFromDb,
  completeTask as completeTaskInDb,
  deleteTask as deleteTaskFromDb,
} from "../repositories/task-repository";

import { ToolError } from "../agents/tool-error";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
};

export async function createTask(title: string): Promise<Task> {
  return createTaskInDb(title);
}

export async function listTasks(): Promise<Task[]> {
  return listTasksFromDb();
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