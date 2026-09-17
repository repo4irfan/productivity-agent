import { MongoClient, type Filter } from "mongodb";

export type Priority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;   // "YYYY-MM-DD"
  createdAt: Date;
  completedAt: Date | null;
};

export type TaskFilter = {
  status?: "open" | "completed" | "all";
  priority?: Priority;
  due?: "overdue" | "today" | "this_week" | "no_due_date";
};

const client = new MongoClient("mongodb://localhost:27018");

export const db = client.db("productivity_agent");

const tasksCollection = db.collection<Task>("tasks");

export async function connectDatabase() {
  await client.connect();

  console.log("MongoDB connected");
}

export type CreateTaskInput = {
  title: string;
  priority?: Priority;
  dueDate?: string | null;
};

export async function createTask(
  input: CreateTaskInput
): Promise<Task> {
  const task: Task = {
    id: crypto.randomUUID(),
    title: input.title,
    completed: false,
    priority: input.priority ?? "medium",
    dueDate: input.dueDate ?? null,
    createdAt: new Date(),
    completedAt: null,
  };

  await tasksCollection.insertOne(task);

  return toTask(task);
}

export async function listTasks(
  filter: TaskFilter = {}
): Promise<Task[]> {
  const query: Filter<Task> = {};

  const status = filter.status ?? "open";

  if (status !== "all") {
    query.completed = status === "completed";
  }

  if (filter.priority) {
    query.priority = filter.priority;
  }

  const today = new Date().toLocaleDateString("en-CA");

  switch (filter.due) {
    case "overdue":
      query.dueDate = { $lt: today };
      query.completed = false;
      break;
    case "today":
      query.dueDate = today;
      break;
    case "this_week":
      query.dueDate = { $gte: today, $lte: addDays(today, 6) };
      break;
    case "no_due_date":
      query.dueDate = null;
      break;
  }

  const tasks = await tasksCollection.find(query).toArray();

  return tasks.map(toTask).sort(byDueDate);
}

export async function findTasks(query: string): Promise<Task[]> {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const tasks = await tasksCollection
    .find({ title: { $regex: escaped, $options: "i" } })
    .toArray();

  return tasks.map(toTask);
}

export async function completeTask(
  id: string
): Promise<Task | null> {
  const result = await tasksCollection.findOneAndUpdate(
    { id },
    { $set: { completed: true, completedAt: new Date() } },
    { returnDocument: "after" }
  );

  return result ? toTask(result) : null;
}

export async function deleteTask(
  id: string
): Promise<Task | null> {
  const task = await tasksCollection.findOne({ id });

  if (!task) {
    return null;
  }

  await tasksCollection.deleteOne({ id });

  return toTask(task);
}

function toTask(document: Task): Task {
  return {
    id: document.id,
    title: document.title,
    completed: document.completed,
    priority: document.priority ?? "medium",
    dueDate: document.dueDate ?? null,
    createdAt: document.createdAt ?? new Date(0),
    completedAt: document.completedAt ?? null,
  };
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
}

function byDueDate(a: Task, b: Task): number {
  if (a.dueDate === b.dueDate) return 0;
  if (a.dueDate === null) return 1;
  if (b.dueDate === null) return -1;
  return a.dueDate < b.dueDate ? -1 : 1;
}