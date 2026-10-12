import { runAgent } from "../src/agents/agent";
import { runTurn, type TurnTrace } from "../src/observability/tracer";
import type { AgentState } from "../src/agents/agent-state";
import type { EvalCase, EvalTurn, TurnExpectations } from "./cases";
import { autoDeny, autoApprove } from "../src/guardrails/approval"

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

  const turns: EvalTurn[] = [
    { prompt: evalCase.prompt, ...expectationsOf(evalCase) },
    ...(evalCase.followUps ?? []),
  ];

  const failures: string[] = [];
  const allTools: string[] = [];

  let lastReply = "";
  let totalMs = 0;

  for (const [index, turn] of turns.entries()) {
    let trace: TurnTrace | undefined;
    let reply = "";

    const approval = turn.approval ?? evalCase.approval;

    try {
      reply = await runTurn(
        state.conversationId,
        turn.prompt,
        () =>
          runAgent(state, turn.prompt, {
            approve: approval === "deny" ? autoDeny : autoApprove,
          }),
        (captured) => {
          trace = captured;
        }
      );
    } catch (error) {
      reply = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
    }

    const tools = (trace?.spans ?? [])
      .filter((span) => span.kind === "tool")
      .map((span) => span.name);

    const turnFailures = reply.startsWith("ERROR:")
      ? [reply]
      : check(turn, tools, reply, trace);

    const label = turns.length > 1 ? `turn ${index + 1}: ` : "";

    failures.push(...turnFailures.map((failure) => `${label}${failure}`));

    allTools.push(...tools);
    lastReply = reply;
    totalMs += trace?.durationMs ?? 0;
  }

  const verifyFailure = await evalCase.verify?.();

  if (verifyFailure) {
    failures.push(verifyFailure);
  }

  return {
    id: evalCase.id,
    passed: failures.length === 0,
    failures,
    tools: allTools,
    reply: lastReply,
    durationMs: totalMs,
  };
}

function expectationsOf(evalCase: EvalCase): TurnExpectations {
  return {
    expectTools: evalCase.expectTools,
    forbidTools: evalCase.forbidTools,
    expectToolArgs: evalCase.expectToolArgs,
    maxToolCalls: evalCase.maxToolCalls,
    answerIncludesAny: evalCase.answerIncludesAny,
    answerExcludes: evalCase.answerExcludes,
  };
}

function check(
    expectations: TurnExpectations,
    tools: string[],
    reply: string,
    trace: TurnTrace | undefined
): string[] {
  
  const failures: string[] = [];
  const lower = reply.toLowerCase();

  if (expectations.expectTools && !isOrderedSubsequence(expectations.expectTools, tools)) {
    failures.push(`expected tools ${expectations.expectTools.join(" → ")}, got ${tools.join(" → ") || "none"}`);
  }

  for (const tool of expectations.forbidTools ?? []) {
    if (tools.includes(tool)) failures.push(`forbidden tool called: ${tool}`);
  }

  if (expectations.maxToolCalls !== undefined && tools.length > expectations.maxToolCalls) {
    failures.push(`expected at most ${expectations.maxToolCalls} tool calls, got ${tools.length}`);
  }

  if (expectations.answerIncludesAny && !expectations.answerIncludesAny.some((s) => lower.includes(s.toLowerCase()))) {
    failures.push(`reply did not include any of: ${expectations.answerIncludesAny.join(" | ")}`);
  }

  for (const s of expectations.answerExcludes ?? []) {
    if (lower.includes(s.toLowerCase())) failures.push(`reply included forbidden text: ${s}`);
  }
  
  for (const [tool, expected] of Object.entries(expectations.expectToolArgs ?? {})) {
    const span = trace?.spans.find((s) => s.kind === "tool" && s.name === tool);
    const actual = span ? JSON.parse(String(span.data?.arguments ?? "{}")) : {};

    for (const [key, value] of Object.entries(expected)) {
      if (JSON.stringify(actual[key]) !== JSON.stringify(value)) {
        failures.push(
          `${tool}.${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual[key])}`
        );
      }
    }
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