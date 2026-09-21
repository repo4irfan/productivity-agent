import { describe, expect, it } from "vitest";
import { toolRegistry } from "./tool-registry";

describe("toolRegistry", () => {
  it("registers every tool under its own name", () => {
    for (const [key, tool] of Object.entries(toolRegistry)) {
      expect(tool.name).toBe(key);
    }
  });

  it("has no duplicate tool names", () => {
    const names = Object.values(toolRegistry).map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });
});