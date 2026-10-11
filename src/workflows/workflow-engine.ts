import { getActiveRun, createRun, saveRun } from "./workflow-repository";
import type { WorkflowDefinition, WorkflowRun, WorkflowData } from "./workflow-types";
import { weeklyReview } from "./weekly-review";

const workflows: Record<string, WorkflowDefinition> = {
  [weeklyReview.name]: weeklyReview,
};

const MAX_STEPS_PER_TURN = 10;

export type WorkflowTurnResult = { reply: string; finished: boolean };

export type StepOutcome = {
  reply: string;
  finished: boolean;
  stepIndex: number;
  data: WorkflowData;
};

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

/** Pure: runs steps until one asks or finishes. No database access. */
export async function runSteps(
  definition: WorkflowDefinition,
  startIndex: number,
  startData: WorkflowData,
  answer?: string
): Promise<StepOutcome> {
  let stepIndex = startIndex;
  let data = startData;
  let currentAnswer = answer;

  for (let guard = 0; guard < MAX_STEPS_PER_TURN; guard++) {
    const step = definition.steps[stepIndex];

    if (!step) {
      return { reply: "Workflow complete.", finished: true, stepIndex, data };
    }

    const result = await step.run({ data, answer: currentAnswer });
    currentAnswer = undefined;

    if (result.type === "ask") {
      return {
        reply: result.question,
        finished: false,
        stepIndex: result.repeat ? stepIndex : stepIndex + 1,
        data,
      };
    }

    if (result.type === "finish") {
      return { reply: result.summary, finished: true, stepIndex, data };
    }

    data = { ...data, ...(result.data ?? {}) };
    stepIndex++;
  }

  throw new Error("Workflow exceeded the maximum number of steps in one turn.");
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

  const outcome = await runSteps(definition, run.stepIndex, run.data, answer);

  await saveRun(run.id, {
    stepIndex: outcome.stepIndex,
    data: outcome.data,
    ...(outcome.finished ? { status: "done" as const } : {}),
  });

  return { reply: outcome.reply, finished: outcome.finished };
}

function isCancellation(answer: string): boolean {
  return ["cancel", "stop", "quit", "nevermind", "never mind"].includes(
    answer.trim().toLowerCase()
  );
}