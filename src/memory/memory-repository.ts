import { db } from "../repositories/task-repository";

export type Memory = {
  id: string;
  content: string;
  createdAt: Date;
};

const memoriesCollection = db.collection<Memory>("memories");

export async function saveMemory(
  content: string
): Promise<Memory> {
  const memory: Memory = {
    id: crypto.randomUUID(),
    content,
    createdAt: new Date(),
  };

  await memoriesCollection.insertOne(memory);

  return memory;
}

export async function listMemories(): Promise<Memory[]> {
  return memoriesCollection
    .find()
    .sort({ createdAt: -1 })
    .toArray();
}