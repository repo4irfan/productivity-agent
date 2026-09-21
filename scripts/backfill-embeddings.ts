import "dotenv/config";
import { db } from "../src/repositories/task-repository";
import { getEmbeddingClient } from "../src/llm";

const embeddings = getEmbeddingClient();

const collection = db.collection("memories");

const missing = await collection
  .find({})
  .toArray();

console.log(`Embedding ${missing.length} memories with ${embeddings.embeddingModel}`);

for (const memory of missing) {
  const [embedding] = await embeddings.embed([memory.content], "document");

  await collection.updateOne(
    { _id: memory._id },
    { $set: { embedding, embeddingModel: embeddings.embeddingModel } }
  );

  console.log("  ✓", memory.content);
}

process.exit(0);