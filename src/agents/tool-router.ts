import { z } from "zod";
import { toolRegistry } from "./tool-registry";
import { ToolError } from "./tool-error";
import { traced, currentTrace } from "../observability/tracer";
import { checkToolCall, checkExternalToolCall, MUTATING_TOOLS } from "../guardrails/tool-policy";
import { autoDeny } from "../guardrails/approval";
import { log } from "../observability/logger";
import { getExternalTool, callExternalTool, } from "../mcp/client-manager";
import type { ExternalTool } from "../mcp/client-manager";
import type { ApprovalHandler } from "../guardrails/approval";
import type { AnyAgentTool } from "./tool-types";

type ToolName = keyof typeof toolRegistry;

type ToolResult =
  | {
      success: true;
      data: unknown;
    }
  | {
      success: false;
      error: string;
    };

function isToolName(name: string): name is ToolName {
  return name in toolRegistry;
}

export type ExecuteOptions = { approve: ApprovalHandler };

export async function executeTool(
  name: string,
  argumentsJson: string,
  options: ExecuteOptions = { approve: autoDeny }
): Promise<ToolResult> {
  return traced(
    "tool",
    name,
    () => executeToolInner(name, argumentsJson, options),
    (result) => ({
      success: result.success,
      arguments: argumentsJson,
      ...(result.success ? {} : { error: result.error }),
    })
  );
}

async function executeToolInner(
  name: string,
  argumentsJson: string,
  options: ExecuteOptions
): Promise<ToolResult> {

  try {
    if (!isToolName(name)) {
      const external = getExternalTool(name);

      if (!external) {
        return { success: false, error: "Unknown tool." };
      }

      return executeExternalTool(external, argumentsJson, options);
    }

    const tool: AnyAgentTool = toolRegistry[name];

    let args: unknown;

    try {
      args = JSON.parse(argumentsJson);
    } catch {
      return {
        success: false,
        error: "Invalid tool arguments.",
      };
    }

    const parsed = tool.schema.safeParse(args);

    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid tool arguments: ${z.prettifyError(parsed.error)}`,
      };
    }

    const mutationsSoFar = (currentTrace()?.spans ?? []).filter(
      (span) => span.kind === "tool" && MUTATING_TOOLS.has(span.name) && span.data?.["success"] === true
    ).length;

    const policy = checkToolCall(name, parsed.data, mutationsSoFar);

    if (policy.decision === "deny") {
      return { success: false, error: policy.reason };
    }

    if (policy.decision === "confirm") {
      const approved = await traced(
        "approval",
        name,
        () => options.approve({ tool: name, args: parsed.data, description: policy.description }),
        (result) => ({ approved: result })
      );

      if (!approved) {
        return {
          success: false,
          error: "Not done: the user declined this action.",
        };
      }
    }

    const result = await tool.execute(parsed.data);


    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof ToolError) {
      return {
        success: false,
        error: error.message,
      };
    }

    console.error("Tool execution failed:", error);

    return {
      success: false,
      error: "Tool execution failed.",
    };
  }
}

async function executeExternalTool(
  external: ExternalTool,
  argumentsJson: string,
  options: ExecuteOptions
): Promise<ToolResult> {
  let args: Record<string, unknown>;

  try {
    args = JSON.parse(argumentsJson) as Record<string, unknown>;
  } catch {
    return { success: false, error: "Invalid tool arguments." };
  }

  const policy = checkExternalToolCall(external.name, external.trust, args);

  if (policy.decision === "deny") {
    return { success: false, error: policy.reason };
  }

  if (policy.decision === "confirm") {
    const approved = await traced(
      "approval",
      external.name,
      () => options.approve({
        tool: external.name,
        args,
        description: policy.description,
      }),
      (result) => ({ approved: result })
    );

    if (!approved) {
      return { success: false, error: "Not done: the user declined this action." };
    }
  }

  try {
    const result = await callExternalTool(external, args);

    return result.success
      ? { success: true, data: result.data }
      : { success: false, error: String(result.data) || "The external tool reported an error." };
  } catch (error) {
    log.info(`MCP call failed: ${external.name}`, error);

    return { success: false, error: "The external tool could not be reached." };
  }
}