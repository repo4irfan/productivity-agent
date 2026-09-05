import {
  createTask as createTaskInDb,
  listTasks as listTasksFromDb,
  completeTask as completeTaskInDb,
  deleteTask as deleteTaskFromDb,
} from "../repositories/task-repository";

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

export async function completeTask(
  id: string
): Promise<Task | null> {
  return completeTaskInDb(id);
}

export async function deleteTask(
  id: string
): Promise<Task | null> {
  return deleteTaskFromDb(id);
}