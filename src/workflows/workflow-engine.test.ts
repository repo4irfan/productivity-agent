import { describe, expect, it } from "vitest";
import { runSteps } from "./workflow-engine";
import type { WorkflowDefinition } from "./workflow-types";

const definition: WorkflowDefinition = {
  name: "test",
  steps: [
    { id: "gather", run: async () => ({ type: "continue", data: { gathered: true } }) },
    { id: "ask", run: async () => ({ type: "ask", question: "How are you?" }) },
    {
      id: "consume",
      run: async ({ answer }) =>
        !answer || answer.length < 3
          ? { type: "ask", repeat: true, question: "Say more." }
          : { type: "finish", summary: `Got: ${answer}` },
    },
  ],
};

describe("runSteps", () => {
  it("runs through continue steps and stops at the first ask", async () => {
    const outcome = await runSteps(definition, 0, {});

    expect(outcome).toMatchObject({
      reply: "How are you?",
      finished: false,
      stepIndex: 2,
      data: { gathered: true },
    });
  });

  it("stays on the same step when an ask repeats", async () => {
    const outcome = await runSteps(definition, 2, {}, "no");

    expect(outcome).toMatchObject({ reply: "Say more.", stepIndex: 2, finished: false });
  });

  it("passes the answer to the step that resumes", async () => {
    const outcome = await runSteps(definition, 2, {}, "pretty good");

    expect(outcome).toMatchObject({ reply: "Got: pretty good", finished: true });
  });

  it("finishes when there are no steps left", async () => {
    const outcome = await runSteps(definition, 3, {});

    expect(outcome).toMatchObject({ reply: "Workflow complete.", finished: true });
  });

  it("throws if steps never stop", async () => {
    const looping: WorkflowDefinition = {
      name: "loop",
      steps: [{ id: "forever", run: async () => ({ type: "continue" }) }],
    };

    await expect(runSteps(looping, 0, {})).rejects.toThrow("maximum number of steps");
  });
});