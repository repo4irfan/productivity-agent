import { db } from "../src/repositories/task-repository";
import { createTask, findTasks } from "../src/tools/task-tools";

export async function resetEvalData(): Promise<void> {
  await db.collection("tasks").deleteMany({ title: /^Eval / });
  await db.collection("conversations").deleteMany({ id: /^eval-/ });
  await db.collection("workflow_runs").deleteMany({ conversationId: /^eval-/ });
  await db.collection("memories").deleteMany({ content: /Eval focus marker/ });
}

export async function givenTask(title: string): Promise<void> {
  await createTask({ title });
}

export async function countTasks(title: string): Promise<number> {
  return (await findTasks(title)).length;
}

export async function countMemories(pattern: RegExp): Promise<number> {
  return db.collection("memories").countDocuments({ content: pattern });
}