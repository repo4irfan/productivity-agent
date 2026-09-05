import { z } from "zod";

import {
  createTask,
  listTasks,
  completeTask,
  deleteTask,
} from "../tools/task-tools";

const createTaskSchema = z.object({
  title: z.string().min(10),
});

const completeTaskSchema = z.object({
  id: z.string().uuid(),
});

const deleteTaskSchema = z.object({
  id: z.string().uuid(),
});

export async function executeTool(
  name: string,
  argumentsJson: string
) {
    try {
        const args = JSON.parse(argumentsJson);

        switch (name) {
            case "create_task": {
                const validatedArgs = createTaskSchema.parse(args);

                return {
                    success: true,
                    data: await createTask(validatedArgs.title),
                };
            }

      case "list_tasks": {
        return {
          success: true,
          data: await listTasks(),
        };
      }

      case "complete_task": {
        const validatedArgs = completeTaskSchema.parse(args);

        return {
          success: true,
          data: await completeTask(validatedArgs.id),
        };
      }

      case "delete_task": {
        const validatedArgs = deleteTaskSchema.parse(args);

        return {
          success: true,
          data: await deleteTask(validatedArgs.id),
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : "Tool execution failed",
    };
  }
}