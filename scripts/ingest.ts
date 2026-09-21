import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ingestDocument } from "../src/rag/document-repository";

const [filePath, ...titleParts] = process.argv.slice(2);

if (!filePath) {
  console.error('Usage: npm run ingest -- <file> ["Title"]');
  process.exit(1);
}

const text = await readFile(filePath, "utf8");
const title = titleParts.join(" ") || path.basename(filePath);

const { chunkCount } = await ingestDocument({
  title,
  source: path.relative(process.cwd(), filePath),
  text,
});

console.log(`Ingested "${title}" as ${chunkCount} chunks`);
process.exit(0);