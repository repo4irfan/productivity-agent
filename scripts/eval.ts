import "../evals/quiet";
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { cases } from "../evals/cases";
import { runCase, type EvalResult } from "../evals/runner";
import { resetEvalData } from "../evals/fixtures";

const only = process.argv[2];
const selected = only ? cases.filter((c) => c.id.includes(only)) : cases;

const provider = process.env.LLM_PROVIDER ?? "ollama";
const model = process.env.LLM_MODEL ?? "?";

await resetEvalData();

console.log(`Running ${selected.length} cases on ${provider}/${model}\n`);

const results: EvalResult[] = [];

for (const evalCase of selected) {
  const result = await runCase(evalCase);
  results.push(result);

  const mark = result.passed ? "✓" : "✗";
  console.log(`${mark} ${result.id.padEnd(36)} ${(result.durationMs / 1000).toFixed(1).padStart(6)}s  tools: ${result.tools.join(", ") || "-"}`);

  for (const failure of result.failures) {
    console.log(`     ${failure}`);
  }
}

const passed = results.filter((r) => r.passed).length;
console.log(`\n${passed}/${results.length} passed · ${provider}/${model}`);

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
const file = `evals/results/${stamp}-${provider}-${model.replace(/[^\w.-]/g, "_")}.json`;

await mkdir("evals/results", { recursive: true });
await writeFile(file, JSON.stringify({ provider, model, passed, total: results.length, results }, null, 2));

console.log(`Saved ${file}`);
process.exit(passed === results.length ? 0 : 1);