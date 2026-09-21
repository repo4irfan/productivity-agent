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

const MIN_SEARCH_SCORE = 0.55;
const EMBED_BATCH_SIZE = 16;
const MAX_DOCUMENT_CHARS = 6000;
const EXPAND_MIN_HITS = 2;
const EXPAND_MAX_CHARS = 3000;

const chunksCollection = db.collection<ChunkDocument>("chunks");

export async function readDocument(title: string): Promise<DocumentChunk[]> {
  const chunks = await chunksCollection
    .find(
      { documentTitle: { $regex: escapeRegex(title), $options: "i" } },
      { projection: { embedding: 0 } }
    )
    .sort({ index: 1 })
    .toArray();

  let total = 0;
  const kept: DocumentChunk[] = [];

  for (const chunk of chunks) {
    total += chunk.content.length;
    if (total > MAX_DOCUMENT_CHARS) break;
    kept.push(toChunk(chunk));
  }

  return kept;
}

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
      batch.map((content) => `${input.title}\n\n${content}`),
      "document"
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

  const [queryVector] = await embeddings.embed([query], "query");

  if (!queryVector) {
    throw new Error("Embedding client returned no vector.");
  }

  const documents = await chunksCollection
    .find({ embeddingModel: embeddings.embeddingModel })
    .toArray();

  const topResults = documents
    .map((document) => ({
      ...toChunk(document),
      score: round(cosineSimilarity(queryVector, document.embedding)),
    }))
    .filter((result) => result.score >= MIN_SEARCH_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return expandSmallDocuments(topResults);
}

/**
 * Parent-document retrieval: when several hits come from the same small
 * document, return that whole document in order instead of fragments.
 */
async function expandSmallDocuments(
  results: ChunkSearchResult[]
): Promise<ChunkSearchResult[]> {
  const hitsBySource = new Map<string, ChunkSearchResult[]>();

  for (const result of results) {
    hitsBySource.set(result.source, [
      ...(hitsBySource.get(result.source) ?? []),
      result,
    ]);
  }

  const expanded: ChunkSearchResult[] = [];
  const expandedSources = new Set<string>();

  for (const result of results) {
    if (expandedSources.has(result.source)) {
      continue;
    }

    const hits = hitsBySource.get(result.source) ?? [];

    if (hits.length < EXPAND_MIN_HITS) {
      expanded.push(result);
      continue;
    }

    const allChunks = await chunksCollection
      .find({ source: result.source }, { projection: { embedding: 0 } })
      .sort({ index: 1 })
      .toArray();

    const totalChars = allChunks.reduce(
      (sum, chunk) => sum + chunk.content.length,
      0
    );

    if (totalChars > EXPAND_MAX_CHARS) {
      expanded.push(result);
      continue;
    }

    const bestScore = Math.max(...hits.map((hit) => hit.score));

    expanded.push(
      ...allChunks.map((chunk) => ({ ...toChunk(chunk), score: bestScore }))
    );

    expandedSources.add(result.source);
  }

  return expanded;
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

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}