import { describe, expect, it } from "vitest";
import { toOpenAIMessage } from "./openai-client";

describe("toOpenAIMessage", () => {
  it("converts an assistant tool call with stringified arguments", () => {
    expect(
      toOpenAIMessage({
        role: "assistant",
        content: "",
        tool_calls: [{ id: "call_1", name: "list_tasks", arguments: { due: "today" } }],
      })
    ).toEqual({
      role: "assistant",
      content: null,
      tool_calls: [
        { id: "call_1", type: "function", function: { name: "list_tasks", arguments: '{"due":"today"}' } },
      ],
    });
  });

  it("converts a tool result keyed by tool_call_id", () => {
    expect(
      toOpenAIMessage({ role: "tool", tool_call_id: "call_1", tool_name: "list_tasks", content: "{}" })
    ).toEqual({ role: "tool", tool_call_id: "call_1", content: "{}" });
  });
});