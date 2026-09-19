import { db } from "../repositories/task-repository";
import { getEmbeddingClient } from "../llm";

export type Memory = {
  id: string;
  content: string;
  createdAt: Date;
};

// What is actually stored. The vector never leaves the repository.
type MemoryDocument = Memory & {
  embedding: number[];
  embeddingModel: string;
};

const memoriesCollection = db.collection<MemoryDocument>("memories");

export async function saveMemory(content: string): Promise<Memory> {
  const embeddings = getEmbeddingClient();

  const [embedding] = await embeddings.embed([content]);

  if (!embedding) {
    throw new Error("Embedding client returned no vector.");
  }

  const document: MemoryDocument = {
    id: crypto.randomUUID(),
    content,
    createdAt: new Date(),
    embedding,
    embeddingModel: embeddings.embeddingModel,
  };

  await memoriesCollection.insertOne(document);

  return toMemory(document);
}

export async function listMemories(): Promise<Memory[]> {
  const documents = await memoriesCollection
    .find({}, { projection: { embedding: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  return documents.map(toMemory);
}

function toMemory(document: Memory): Memory {
  return {
    id: document.id,
    content: document.content,
    createdAt: document.createdAt,
  };
}

export async function searchMemories(
  query: string
): Promise<Memory[]> {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);

  if (words.length === 0) {
    return [];
  }

  const memories = await memoriesCollection
    .find()
    .toArray();

  return memories.filter((memory) => {
    const content = memory.content.toLowerCase();

    return words.some((word) =>
      content.includes(word)
    );
  });
}