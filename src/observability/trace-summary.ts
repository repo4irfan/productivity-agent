import type { TurnTrace } from "./tracer";

export function summarizeTrace(trace: TurnTrace): string {
  const llm = trace.spans.filter((span) => span.kind === "llm");
  const embeds = trace.spans.filter((span) => span.kind === "embed");
  const tools = trace.spans.filter((span) => span.kind === "tool");
  const memories = trace.spans.find((span) => span.name === "memories");

  const promptTokens = sum(llm, "promptTokens");
  const cachedTokens = sum(llm, "cachedTokens");
  const cachedPercent =
    promptTokens > 0 ? Math.round((cachedTokens / promptTokens) * 100) : 0;

  const parts = [
    `${(trace.durationMs / 1000).toFixed(1)}s`,
    `llm ×${llm.length} (${llm.map((s) => `${s.name} ${(s.durationMs / 1000).toFixed(1)}s`).join(" · ")})`,
    `prompt ${promptTokens} tok, ${cachedPercent}% cached`,
    `embed ×${embeds.length}`,
  ];

  if (tools.length > 0) {
    parts.push(`tools: ${tools.map((s) => `${s.name} ${s.ok && s.data?.success ? "✓" : "✗"}`).join(", ")}`);
  }

  if (memories) {
    parts.push(`memories ${memories.data?.count} (top ${memories.data?.topScore ?? "-"})`);
  }

  parts.push(trace.outcome);

  return `[trace ${trace.id}] ${parts.join(" · ")}`;
}

function sum(spans: TurnTrace["spans"], key: string): number {
  return spans.reduce((total, span) => total + Number(span.data?.[key] ?? 0), 0);
}