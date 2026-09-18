import { describe, expect, it } from "vitest";
import { toOllamaMessage } from "./ollama-client";

describe("toOllamaMessage", () => {
  it("converts an assistant tool call", () => {
    expect(
      toOllamaMessage({
        role: "assistant",
        content: "",
        tool_calls: [{ id: "call_1", name: "list_tasks", arguments: { due: "today" } }],
      })
    ).toEqual({
      role: "assistant",
      content: "",
      tool_calls: [{ function: { name: "list_tasks", arguments: { due: "today" } } }],
    });
  });

  it("converts a tool result", () => {
    expect(
      toOllamaMessage({
        role: "tool",
        tool_call_id: "call_1",
        tool_name: "list_tasks",
        content: "{}",
      })
    ).toEqual({ role: "tool", content: "{}", tool_name: "list_tasks" });
  });
});