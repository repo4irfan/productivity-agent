import { describe, expect, it } from "vitest";
import { runTurn, traced, type TurnTrace } from "./tracer";

describe("tracer", () => {
  it("records spans inside a turn and hands the trace to the sink", async () => {
    let captured: TurnTrace | undefined;

    const reply = await runTurn("conv", "hi", async () => {
      await traced("tool", "list_tasks", async () => "ok", () => ({ success: true }));
      return "done";
    }, (trace) => { captured = trace; });

    expect(reply).toBe("done");
    expect(captured?.spans).toHaveLength(1);
    expect(captured?.spans[0]).toMatchObject({ kind: "tool", name: "list_tasks", ok: true });
    expect(captured?.outcome).toBe("reply");
  });

  it("records a failed span and rethrows", async () => {
    let captured: TurnTrace | undefined;

    await expect(
      runTurn("conv", "hi", async () => {
        await traced("llm", "agent", async () => { throw new Error("boom"); });
        return "unreachable";
      }, (trace) => { captured = trace; })
    ).rejects.toThrow("boom");

    expect(captured?.spans[0]?.ok).toBe(false);
    expect(captured?.outcome).toBe("error");
  });

  it("is a no-op outside a turn", async () => {
    await expect(traced("tool", "x", async () => 42)).resolves.toBe(42);
  });
});