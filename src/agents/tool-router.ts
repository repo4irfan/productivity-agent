import { toolRegistry } from "./tool-registry";
import { ToolError } from "./tool-error";

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

export async function executeTool(
  name: string,
  argumentsJson: string
): Promise<ToolResult> {
  try {
    if (!isToolName(name)) {
      return {
        success: false,
        error: "Unknown tool.",
      };
    }

    const tool = toolRegistry[name];

    let args: unknown;

    try {
      args = JSON.parse(argumentsJson);
    } catch {
      return {
        success: false,
        error: "Invalid tool arguments.",
      };
    }

    let validatedArgs: unknown;

    try {
      validatedArgs = tool.schema.parse(args);
    } catch {
      return {
        success: false,
        error: "Invalid tool arguments.",
      };
    }

    const result = await tool.execute(validatedArgs);

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