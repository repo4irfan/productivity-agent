import { db } from "../repositories/task-repository";
import type { WorkflowData, WorkflowRun } from "./workflow-types";

const runsCollection = db.collection<WorkflowRun>("workflow_runs");

export async function createRun(
  conversationId: string,
  workflowName: string
): Promise<WorkflowRun> {
  const now = new Date();

  const run: WorkflowRun = {
    id: crypto.randomUUID(),
    conversationId,
    workflowName,
    stepIndex: 0,
    data: {},
    status: "awaiting_input",
    createdAt: now,
    updatedAt: now,
  };

  await runsCollection.insertOne(run);

  return run;
}

export async function getActiveRun(
  conversationId: string
): Promise<WorkflowRun | null> {
  return runsCollection.findOne({ conversationId, status: "awaiting_input" });
}

export async function saveRun(
  id: string,
  changes: Partial<Pick<WorkflowRun, "stepIndex" | "data" | "status">>
): Promise<void> {
  await runsCollection.updateOne(
    { id },
    { $set: { ...changes, updatedAt: new Date() } }
  );
}