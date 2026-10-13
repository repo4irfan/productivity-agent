import { readFile } from "node:fs/promises";
import { z } from "zod";

const trustSchema = z.enum(["read-only", "confirm", "trusted"]);

const configSchema = z.object({
  servers: z.record(
    z.string(),
    z.object({
      command: z.string(),
      args: z.array(z.string()).default([]),
      env: z.record(z.string(), z.string()).optional(),
      /** read-only: never mutates. confirm: ask the user. trusted: run freely. */
      trust: trustSchema.default("confirm"),
      /** If present, only these remote tool names are exposed. */
      allowTools: z.array(z.string()).optional(),
    })
  ),
});

export type McpTrust = z.infer<typeof trustSchema>;
export type McpConfig = z.infer<typeof configSchema>;

export async function loadMcpConfig(
  path = "mcp.config.json"
): Promise<McpConfig> {
  try {
    const raw = await readFile(path, "utf8");

    return configSchema.parse(JSON.parse(raw));
  } catch {
    // No config, or an invalid one: run with local tools only.
    return { servers: {} };
  }
}