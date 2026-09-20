import "dotenv/config";
import { searchMemories } from "../src/memory/memory-repository";

const query = process.argv.slice(2).join(" ");

if (!query) {
  console.error('Usage: npm run search:memories -- "your query"');
  process.exit(1);
}

const results = await searchMemories(query, 100);

console.log(`\nQuery: "${query}"\n`);

for (const result of results) {
  console.log(`${result.score.toFixed(3)}  ${result.content}`);
}

process.exit(0);