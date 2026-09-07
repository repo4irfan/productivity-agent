import { toolRegistry } from "./tool-registry";

export async function executeTool(
  name: string,
  argumentsJson: string
) {
  try {
    const tool = toolRegistry[name as keyof typeof toolRegistry];

    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const args = JSON.parse(argumentsJson);

    const validatedArgs = tool.schema.parse(args);

    const result = await tool.execute(validatedArgs);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Tool execution failed",
    };
  }
}