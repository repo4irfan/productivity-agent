import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { toolRegistry } from "../agents/tool-registry";
import { executeTool } from "../agents/tool-router";
import { autoApprove } from "../guardrails/approval";
import { CONFIRM_TOOLS, MUTATING_TOOLS } from "../guardrails/tool-policy";

/** Tools that need an active conversation, so they can't work over MCP. */
const EXCLUDED = new Set(["start_weekly_review"]);

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: "productivity-agent",
    version: "1.0.0",
  });

  for (const [name, tool] of Object.entries(toolRegistry)) {
    if (EXCLUDED.has(name)) {
      continue;
    }

    const shape = (tool.schema as z.ZodObject<z.ZodRawShape>).shape;

    server.registerTool(
      name,
      {
        description: tool.description,
        inputSchema: shape,
        annotations: {
          readOnlyHint: !MUTATING_TOOLS.has(name),
          destructiveHint: CONFIRM_TOOLS.has(name),
        },
      },
      async (args) => {
        // The MCP host (e.g. Claude Desktop) asks the user before calling a
        // tool, so approval has already happened by the time we get here.
        const result = await executeTool(
          name,
          JSON.stringify(args ?? {}),
          { approve: autoApprove }
        );

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          isError: !result.success,
        };
      }
    );
  }

  await server.connect(new StdioServerTransport());
}