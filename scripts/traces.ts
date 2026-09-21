import "dotenv/config";
import { listRecentTraces } from "../src/observability/trace-repository";

const traces = await listRecentTraces(50);

if (traces.length === 0) {
  console.log("No traces yet.");
  process.exit(0);
}

const avg = (values: number[]) =>
  values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);

const llmSpans = traces.flatMap((t) => t.spans.filter((s) => s.kind === "llm"));
const prompt = llmSpans.reduce((n, s) => n + Number(s.data?.promptTokens ?? 0), 0);
const cached = llmSpans.reduce((n, s) => n + Number(s.data?.cachedTokens ?? 0), 0);

const byKind = new Map<string, number>();
for (const t of traces) {
  for (const s of t.spans) {
    byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + s.durationMs);
  }
}

const totalMs = traces.reduce((n, t) => n + t.durationMs, 0);

console.log(`Last ${traces.length} turns`);
console.log(`  avg turn:        ${(avg(traces.map((t) => t.durationMs)) / 1000).toFixed(1)}s`);
console.log(`  prompt cache:    ${prompt ? Math.round((cached / prompt) * 100) : 0}% of ${prompt} tokens`);
console.log(`  outcomes:        ${traces.map((t) => t.outcome).join(", ")}`);
console.log(`  time by kind:`);

for (const [kind, ms] of byKind) {
  console.log(`    ${kind.padEnd(10)} ${(ms / 1000).toFixed(1)}s  (${Math.round((ms / totalMs) * 100)}%)`);
}

const slowest = [...llmSpans].sort((a, b) => b.durationMs - a.durationMs)[0];
if (slowest) {
  console.log(`  slowest llm call: ${slowest.name} ${(slowest.durationMs / 1000).toFixed(1)}s`);
}

process.exit(0);