export const MUTATING_TOOLS = new Set([
  "create_task", "update_task", "complete_task", "delete_task", "remember",
]);

const MAX_MUTATIONS_PER_TURN = 3;
const MAX_TITLE_CHARS = 200;

export const CONFIRM_TOOLS = new Set(["delete_task"]);

export type PolicyVerdict =
  | { decision: "allow" }
  | { decision: "deny"; reason: string }
  | { decision: "confirm"; description: string };

export function checkToolCall(
  name: string,
  args: Record<string, unknown>,
  mutationsSoFar: number
): PolicyVerdict {
  if (MUTATING_TOOLS.has(name) && mutationsSoFar >= MAX_MUTATIONS_PER_TURN) {
    return {
      decision: "deny",
      reason: `Limit reached: at most ${MAX_MUTATIONS_PER_TURN} changes per message. Ask the user to continue in a new message.`,
    };
  }

  const title = args["title"];

  if (typeof title === "string" && title.length > MAX_TITLE_CHARS) {
    return { decision: "deny", reason: `Title is too long (max ${MAX_TITLE_CHARS} characters).` };
  }

  if (CONFIRM_TOOLS.has(name)) {
    const target = args["title"] ?? args["id"] ?? "?";
    return {
      decision: "confirm",
      description: `${name.replace("_", " ")} → "${String(target)}"`,
    };
  }

  return { decision: "allow" };
}