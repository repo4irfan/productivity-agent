import "dotenv/config";
import { db } from "../src/repositories/task-repository";
import { cosineSimilarity } from "../src/memory/vector-math";

const collection = db.collection("memories");
const memories = await collection.find().sort({ createdAt: 1 }).toArray();

const kept: typeof memories = [];

for (const memory of memories) {
  const duplicateOf = kept.find(
    (k) => cosineSimilarity(k.embedding, memory.embedding) >= 0.9
  );

  if (duplicateOf) {
    console.log(`DELETE  "${memory.content}"\n   dup of "${duplicateOf.content}"`);
    await collection.deleteOne({ _id: memory._id });
  } else {
    kept.push(memory);
  }
}

console.log(`\nKept ${kept.length} of ${memories.length}`);
process.exit(0);