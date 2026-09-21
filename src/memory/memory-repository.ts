import { db } from "../repositories/task-repository";
import { getEmbeddingClient } from "../llm";
import { cosineSimilarity } from "./vector-math";

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

export type MemorySearchResult = Memory & {
  score: number;
};

export type SaveMemoryResult = {
  memory: Memory;
  created: boolean;
};

const DUPLICATE_THRESHOLD = 0.9;
// Below this, nomic-embed-text scores are noise (unrelated queries score ~0.4–0.5).
const MIN_SEARCH_SCORE = 0.5;

const memoriesCollection = db.collection<MemoryDocument>("memories");

export async function saveMemory(content: string): Promise<SaveMemoryResult> {

  const [existing] = await searchMemories(content, 1);

  if (existing && existing.score >= DUPLICATE_THRESHOLD) {
    const { score, ...memory } = existing;
    return { memory, created: false };
  }

  const embeddings = getEmbeddingClient();

  const [embedding] = await embeddings.embed([content], "document");

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

  return { memory: toMemory(document), created: true };
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
  query: string,
  limit = 5
): Promise<MemorySearchResult[]> {
  const embeddings = getEmbeddingClient();

  const [queryVector] = await embeddings.embed([query], "query");

  if (!queryVector) {
    throw new Error("Embedding client returned no vector.");
  }

  const documents = await memoriesCollection
    .find({ embeddingModel: embeddings.embeddingModel })
    .toArray();

  return documents
    .map((document) => ({
      ...toMemory(document),
      score: round(cosineSimilarity(queryVector, document.embedding)),
    }))
    .sort((a, b) => b.score - a.score)
    .filter((result) => result.score >= MIN_SEARCH_SCORE)
    .slice(0, limit);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}