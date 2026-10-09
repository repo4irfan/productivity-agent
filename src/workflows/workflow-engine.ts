import { getActiveRun, createRun, saveRun } from "./workflow-repository";
import type { WorkflowDefinition, WorkflowRun } from "./workflow-types";
import { weeklyReview } from "./weekly-review";

const workflows: Record<string, WorkflowDefinition> = {
  [weeklyReview.name]: weeklyReview,
};

const MAX_STEPS_PER_TURN = 10;

export type WorkflowTurnResult = { reply: string; finished: boolean };

export async function startWorkflow(
  name: string,
  conversationId: string
): Promise<WorkflowTurnResult> {
  const run = await createRun(conversationId, name);

  return advance(run);
}

export async function resumeWorkflow(
  conversationId: string,
  answer: string
): Promise<WorkflowTurnResult | null> {
  const run = await getActiveRun(conversationId);

  if (!run) {
    return null;
  }

  if (isCancellation(answer)) {
    await saveRun(run.id, { status: "cancelled" });
    return { reply: "Okay, I've stopped the review.", finished: true };
  }

  return advance(run, answer);
}

async function advance(
  run: WorkflowRun,
  answer?: string
): Promise<WorkflowTurnResult> {
  const definition = workflows[run.workflowName];

  if (!definition) {
    await saveRun(run.id, { status: "cancelled" });
    throw new Error(`Unknown workflow: ${run.workflowName}`);
  }

  let stepIndex = run.stepIndex;
  let data = run.data;
  let currentAnswer = answer;

  for (let guard = 0; guard < MAX_STEPS_PER_TURN; guard++) {
    const step = definition.steps[stepIndex];

    if (!step) {
      await saveRun(run.id, { status: "done", data, stepIndex });
      return { reply: "Workflow complete.", finished: true };
    }

    const result = await step.run({ data, answer: currentAnswer });
    currentAnswer = undefined;      // the answer belongs to one step only

    if (result.type === "ask") {
      await saveRun(run.id, {
        stepIndex: result.repeat ? stepIndex : stepIndex + 1,
        data,
      });
      return { reply: result.question, finished: false };
    }

    if (result.type === "finish") {
      await saveRun(run.id, { status: "done", data, stepIndex });
      return { reply: result.summary, finished: true };
    }

    data = { ...data, ...(result.data ?? {}) };
    stepIndex++;
  }

  await saveRun(run.id, { status: "cancelled", data });
  throw new Error("Workflow exceeded the maximum number of steps in one turn.");
}

function isCancellation(answer: string): boolean {
  return ["cancel", "stop", "quit", "nevermind", "never mind"].includes(
    answer.trim().toLowerCase()
  );
}