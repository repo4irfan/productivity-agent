import { db } from "../repositories/task-repository";
import { getEmbeddingClient } from "../llm";
import { cosineSimilarity } from "../memory/vector-math";
import { chunkText } from "./chunker";

export type DocumentChunk = {
  id: string;
  documentTitle: string;
  source: string;
  index: number;
  content: string;
  createdAt: Date;
};

type ChunkDocument = DocumentChunk & {
  embedding: number[];
  embeddingModel: string;
};

export type ChunkSearchResult = DocumentChunk & {
  score: number;
};

export type DocumentSummary = {
  documentTitle: string;
  source: string;
  chunkCount: number;
};

const MIN_SEARCH_SCORE = 0.4;
const EMBED_BATCH_SIZE = 16;

const chunksCollection = db.collection<ChunkDocument>("chunks");

export async function ingestDocument(input: {
  title: string;
  source: string;
  text: string;
}): Promise<{ chunkCount: number }> {
  const embeddings = getEmbeddingClient();

  // Re-ingesting a source replaces its previous chunks.
  await chunksCollection.deleteMany({ source: input.source });

  const contents = chunkText(input.text);
  const documents: ChunkDocument[] = [];

  for (let start = 0; start < contents.length; start += EMBED_BATCH_SIZE) {
    const batch = contents.slice(start, start + EMBED_BATCH_SIZE);

    // Prefixing the title gives each chunk context it would otherwise lack.
    const vectors = await embeddings.embed(
      batch.map((content) => `${input.title}\n\n${content}`)
    );

    batch.forEach((content, offset) => {
      const embedding = vectors[offset];

      if (!embedding) {
        throw new Error("Embedding client returned too few vectors.");
      }

      documents.push({
        id: crypto.randomUUID(),
        documentTitle: input.title,
        source: input.source,
        index: start + offset,
        content,
        createdAt: new Date(),
        embedding,
        embeddingModel: embeddings.embeddingModel,
      });
    });
  }

  if (documents.length > 0) {
    await chunksCollection.insertMany(documents);
  }

  return { chunkCount: documents.length };
}

export async function searchDocuments(
  query: string,
  limit = 4
): Promise<ChunkSearchResult[]> {
  const embeddings = getEmbeddingClient();

  const [queryVector] = await embeddings.embed([query]);

  if (!queryVector) {
    throw new Error("Embedding client returned no vector.");
  }

  const documents = await chunksCollection
    .find({ embeddingModel: embeddings.embeddingModel })
    .toArray();

  return documents
    .map((document) => ({
      ...toChunk(document),
      score: round(cosineSimilarity(queryVector, document.embedding)),
    }))
    .filter((result) => result.score >= MIN_SEARCH_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  return chunksCollection
    .aggregate<DocumentSummary>([
      {
        $group: {
          _id: "$source",
          documentTitle: { $first: "$documentTitle" },
          source: { $first: "$source" },
          chunkCount: { $sum: 1 },
        },
      },
      { $project: { _id: 0 } },
      { $sort: { documentTitle: 1 } },
    ])
    .toArray();
}

function toChunk(document: DocumentChunk): DocumentChunk {
  return {
    id: document.id,
    documentTitle: document.documentTitle,
    source: document.source,
    index: document.index,
    content: document.content,
    createdAt: document.createdAt,
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}