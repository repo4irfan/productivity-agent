export type Task = {
  id: string;
  title: string;
  completed: boolean;
};

const tasks: Task[] = [];

export function createTask(title: string): Task {
  const task: Task = {
    id: crypto.randomUUID(),
    title,
    completed: false,
  };

  tasks.push(task);

  return task;
}

export function listTasks(): Task[] {
  return tasks;
}

export function completeTask(id: string): Task | null {
  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return null;
  }

  task.completed = true;

  return task;
}

export function deleteTask(id: string): Task | null {
  const index = tasks.findIndex((task) => task.id === id);

  if (index === -1) {
    return null;
  }

  const [deletedTask] = tasks.splice(index, 1);

  return deletedTask;
}