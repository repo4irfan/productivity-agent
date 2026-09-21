import { z } from "zod";
import { toolRegistry } from "./tool-registry";
import { ToolError } from "./tool-error";
import { traced } from "../observability/tracer";
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

export async function executeTool(name: string, argumentsJson: string): Promise<ToolResult> {
  return traced("tool", name, () => executeToolInner(name, argumentsJson), (result) =>
    result.success ? { success: true } : { success: false, error: result.error }
  );
}

async function executeToolInner(name: string, argumentsJson: string): Promise<ToolResult> {

  try {
    if (!isToolName(name)) {
      return {
        success: false,
        error: "Unknown tool.",
      };
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