/**
 * Every tool the agent can call.
 *
 * Each tool is declared three times, and all three must agree:
 *   - `schema`        Zod, validates arguments at runtime
 *   - `openAISchema`  JSON Schema, what the model actually sees
 *   - `description`   the model's only documentation for the tool
 *
 * When you change what a tool accepts or does, update its description and
 * both schemas in the same commit. A stale description is indistinguishable
 * from a bad model — the model follows what it reads.
 */

import { z } from "zod";
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

  it("does not describe parameters the schema lacks", () => {
    for (const tool of Object.values(toolRegistry)) {
      const keys = Object.keys(tool.openAISchema.properties);

      for (const word of ["title", "id", "priority", "dueDate", "query"]) {
        if (tool.description.includes(`\`${word}\``)) {
          expect(keys).toContain(word);
        }
      }
    }
  });

  it("declares the same keys in schema and openAISchema", () => {
    for (const tool of Object.values(toolRegistry)) {
      const zodKeys = Object.keys((tool.schema as z.ZodObject<z.ZodRawShape>).shape ?? {});
      const jsonKeys = Object.keys(tool.openAISchema.properties);

      expect(new Set(jsonKeys)).toEqual(new Set(zodKeys));
    }
  });

});