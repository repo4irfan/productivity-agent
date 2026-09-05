import { MongoClient } from "mongodb";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
};

const client = new MongoClient("mongodb://localhost:27018");

export const db = client.db("productivity_agent");

const tasksCollection = db.collection<Task>("tasks");

export async function connectDatabase() {
  await client.connect();

  console.log("MongoDB connected");
}

export async function createTask(title: string): Promise<Task> {
  const task: Task = {
    id: crypto.randomUUID(),
    title,
    completed: false,
  };

  await tasksCollection.insertOne(task);

  return task;
}

export async function listTasks(): Promise<Task[]> {
  return tasksCollection.find().toArray();
}

export async function completeTask(
  id: string
): Promise<Task | null> {
  const result = await tasksCollection.findOneAndUpdate(
    { id },
    {
      $set: {
        completed: true,
      },
    },
    {
      returnDocument: "after",
    }
  );

  return result;
}

export async function deleteTask(
  id: string
): Promise<Task | null> {
  const task = await tasksCollection.findOne({ id });

  if (!task) {
    return null;
  }

  await tasksCollection.deleteOne({ id });

  return task;
}