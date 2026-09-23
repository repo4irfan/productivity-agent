import { describe, expect, it } from "vitest";
import { executeTool } from "./tool-router";
import { autoApprove, autoDeny } from "../guardrails/approval"

describe("executeTool", () => {
  it("returns an error for an unknown tool", async () => {
    const result = await executeTool(
      "does_not_exist",
      "{}"
    );

    expect(result).toEqual({
      success: false,
      error: "Unknown tool.",
    });
  });

  it("returns an error for invalid JSON arguments", async () => {
    const result = await executeTool(
      "create_task",
      "{invalid-json"
    );

    expect(result).toEqual({
      success: false,
      error: "Invalid tool arguments.",
    });
  });

  it("returns an error for invalid tool arguments", async () => {
    const result = await executeTool(
      "create_task",
      JSON.stringify({
        title: 123,
      })
    );

    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining("Invalid tool arguments"),
    });
  });

  it("successfully executes a valid tool", async () => {
    const result = await executeTool(
        "create_task",
        JSON.stringify({
        title: "Learn automated testing",
        })
    );

    expect(result.success).toBe(true);
  });

    it("preserves known tool errors", async () => {
        const result = await executeTool(
            "complete_task",
            JSON.stringify({
            id: "00000000-0000-0000-0000-000000000000",
            })
        );

        expect(result).toEqual({
            success: false,
            error: "Task not found.",
        });
    });

    it("preserves known delete task errors", async () => {
        const result = await executeTool(
            "delete_task",
            JSON.stringify({
              id: "00000000-0000-0000-0000-000000000000",
            }),
            { approve: autoApprove }
        );

        expect(result).toEqual({
            success: false,
            error: "Task not found.",
        });
    });

    it("denies a confirmation-required tool when the user declines", async () => {
      const result = await executeTool(
        "delete_task",
        JSON.stringify({ id: "00000000-0000-0000-0000-000000000000" }),
        { approve: autoDeny }
      );

      expect(result).toMatchObject({ success: false, error: expect.stringContaining("declined") });
    });

    it("registers find_tasks", async () => {
        const result = await executeTool(
            "find_tasks",
            JSON.stringify({ query: "zzz-no-such-task" })
        );

        expect(result).toEqual({ success: true, data: [] });
    });
});