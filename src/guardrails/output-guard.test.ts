import { describe, expect, it } from "vitest";
import { checkOutput } from "./output-guard";
import type { TurnTrace } from "../observability/tracer";

const trace = (spans: TurnTrace["spans"]): TurnTrace => ({
  id: "t", conversationId: "c", userMessage: "", startedAt: new Date(),
  durationMs: 0, spans, outcome: "reply",
});

describe("checkOutput", () => {
  it("blocks an action claim with no mutating tool", () => {
    const reply = checkOutput("I have marked it as completed.", trace([]));
    expect(reply).toContain("Nothing has been changed");
  });

  it("allows an action claim backed by a successful mutation", () => {
    const reply = checkOutput("I've marked it as completed.", trace([
      { kind: "tool", name: "complete_task", durationMs: 1, ok: true, data: { success: true } },
    ]));
    expect(reply).toBe("I've marked it as completed.");
  });

  it("blocks a claim when the mutation failed", () => {
    const reply = checkOutput("I've deleted it.", trace([
      { kind: "tool", name: "delete_task", durationMs: 1, ok: true, data: { success: false } },
    ]));
    expect(reply).toContain("Nothing has been changed");
  });

  it("ignores reports that are not first-person claims", () => {
    const reply = checkOutput("You have completed 3 tasks this week.", trace([]));
    expect(reply).toBe("You have completed 3 tasks this week.");
  });
});