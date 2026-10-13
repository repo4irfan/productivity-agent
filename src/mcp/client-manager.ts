import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { loadMcpConfig, type McpTrust } from "./config";
import { log } from "../observability/logger";
import type { LLMToolDefinition } from "../llm/llm-client";
import type { OpenAIToolParameters } from "../agents/tool-types";

export type ExternalTool = {
  /** Namespaced name the model sees, e.g. mcp__docs__read_file */
  name: string;
  /** The name the server knows it by. */
  remoteName: string;
  serverName: string;
  trust: McpTrust;
  description: string;
  parameters: OpenAIToolParameters;
};

const CALL_TIMEOUT_MS = 30_000;

let tools: Map<string, ExternalTool> | null = null;
const clients = new Map<string, Client>();

/** Connects to every configured server and discovers its tools. Safe to call repeatedly. */
export async function initExternalTools(): Promise<void> {
  if (tools) {
    return;
  }

  tools = new Map();

  const config = await loadMcpConfig();

  for (const [serverName, server] of Object.entries(config.servers)) {
    try {
      const client = new Client({ name: "productivity-agent", version: "1.0.0" });

      await client.connect(
        new StdioClientTransport({
          command: server.command,
          args: server.args,
          ...(server.env ? { env: server.env } : {}),
        })
      );

      clients.set(serverName, client);

      const { tools: remoteTools } = await client.listTools();

      let exposed = 0;

      for (const remote of remoteTools) {
        const name = `mcp__${serverName}__${remote.name}`;

        if (server.allowTools && !server.allowTools.includes(remote.name)) {
            continue;
        }

        tools.set(name, {
          name,
          remoteName: remote.name,
          serverName,
          trust: server.trust,
          description: remote.description ?? remote.name,
          parameters: toToolParameters(remote.inputSchema),
        });

        exposed++;
      }

      log.info(
        `MCP: ${serverName} connected, exposing ${exposed} of ${remoteTools.length} tools`
      );
    } catch (error) {
      log.info(`MCP: ${serverName} failed to connect, skipping.`, error);
    }
  }
}

export function externalToolDefinitions(): LLMToolDefinition[] {
  return [...(tools?.values() ?? [])].map((tool) => ({
    name: tool.name,
    description: `[${tool.serverName}] ${tool.description}`,
    parameters: tool.parameters,
  }));
}

export function getExternalTool(name: string): ExternalTool | undefined {
  return tools?.get(name);
}

export async function callExternalTool(
  tool: ExternalTool,
  args: Record<string, unknown>
): Promise<{ success: boolean; data: unknown }> {
  const client = clients.get(tool.serverName);

  if (!client) {
    throw new Error(`MCP server not connected: ${tool.serverName}`);
  }

  const result = await client.callTool(
    { name: tool.remoteName, arguments: args },
    undefined,
    { timeout: CALL_TIMEOUT_MS }
  );

  const text = (result.content as Array<{ type: string; text?: string }> | undefined)
    ?.filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n");

  return { success: !result.isError, data: text ?? "" };
}

export async function closeExternalTools(): Promise<void> {
  for (const client of clients.values()) {
    await client.close().catch(() => {});
  }

  clients.clear();
  tools = null;
}

function toToolParameters(schema: unknown): OpenAIToolParameters {
  const object = (schema ?? {}) as {
    properties?: Record<string, unknown>;
    required?: string[];
  };

  return {
    type: "object",
    properties: (object.properties ?? {}) as OpenAIToolParameters["properties"],
    required: object.required ?? [],
    additionalProperties: false,
  };
}