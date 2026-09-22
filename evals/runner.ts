import { runAgent } from "../src/agents/agent";
import { runTurn, type TurnTrace } from "../src/observability/tracer";
import type { AgentState } from "../src/agents/agent-state";
import type { EvalCase } from "./cases";

export type EvalResult = {
  id: string;
  passed: boolean;
  failures: string[];
  tools: string[];
  reply: string;
  durationMs: number;
};

export async function runCase(evalCase: EvalCase): Promise<EvalResult> {
  await evalCase.setup?.();

  const state: AgentState = {
    conversationId: `eval-${evalCase.id}-${Date.now()}`,
    conversation: [],
  };

  let trace: TurnTrace | undefined;
  let reply = "";

  try {
    reply = await runTurn(
      state.conversationId,
      evalCase.prompt,
      () => runAgent(state, evalCase.prompt),
      (captured) => { trace = captured; }
    );
  } catch (error) {
    reply = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  const tools = (trace?.spans ?? [])
    .filter((span) => span.kind === "tool")
    .map((span) => span.name);

  const failures = check(evalCase, tools, reply);

  return {
    id: evalCase.id,
    passed: failures.length === 0,
    failures,
    tools,
    reply,
    durationMs: trace?.durationMs ?? 0,
  };
}

function check(evalCase: EvalCase, tools: string[], reply: string): string[] {
  const failures: string[] = [];
  const lower = reply.toLowerCase();

  if (evalCase.expectTools && !isOrderedSubsequence(evalCase.expectTools, tools)) {
    failures.push(`expected tools ${evalCase.expectTools.join(" → ")}, got ${tools.join(" → ") || "none"}`);
  }

  for (const tool of evalCase.forbidTools ?? []) {
    if (tools.includes(tool)) failures.push(`forbidden tool called: ${tool}`);
  }

  if (evalCase.maxToolCalls !== undefined && tools.length > evalCase.maxToolCalls) {
    failures.push(`expected at most ${evalCase.maxToolCalls} tool calls, got ${tools.length}`);
  }

  if (evalCase.answerIncludesAny && !evalCase.answerIncludesAny.some((s) => lower.includes(s.toLowerCase()))) {
    failures.push(`reply did not include any of: ${evalCase.answerIncludesAny.join(" | ")}`);
  }

  for (const s of evalCase.answerExcludes ?? []) {
    if (lower.includes(s.toLowerCase())) failures.push(`reply included forbidden text: ${s}`);
  }

  return failures;
}

function isOrderedSubsequence(expected: string[], actual: string[]): boolean {
  let i = 0;
  for (const tool of actual) {
    if (tool === expected[i]) i++;
  }
  return i === expected.length;
}