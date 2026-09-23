import { db } from "../src/repositories/task-repository";
import { createTask, findTasks } from "../src/tools/task-tools";

export async function resetEvalData(): Promise<void> {
  await db.collection("tasks").deleteMany({ title: /^Eval / });
  await db.collection("conversations").deleteMany({ id: /^eval-/ });
}

export async function givenTask(title: string): Promise<void> {
  await createTask({ title });
}

export async function countTasks(title: string): Promise<number> {
  return (await findTasks(title)).length;
}