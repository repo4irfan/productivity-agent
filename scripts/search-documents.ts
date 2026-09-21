import "dotenv/config";
import { searchDocuments } from "../src/rag/document-repository";

const query = process.argv.slice(2).join(" ");

if (!query) {
  console.error('Usage: npm run search:documents -- "your query"');
  process.exit(1);
}

const results = await searchDocuments(query, 20);

console.log(`\nQuery: "${query}"\n`);

for (const result of results) {
    const preview = result.content.replace(/\s+/g, " ").slice(0, 80);
    console.log(`${result.score.toFixed(3)}  [${result.documentTitle}]  ${preview}…`);
}

process.exit(0);