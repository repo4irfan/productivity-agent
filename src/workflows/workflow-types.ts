export type WorkflowData = Record<string, unknown>;

export type StepResult =
  | { type: "continue"; data?: WorkflowData }   // go to the next step now
  | { type: "ask"; question: string }           // stop, wait for the user's next message
  | { type: "finish"; summary: string };        // workflow is over

export type StepContext = {
  /** Everything gathered so far. */
  data: WorkflowData;
  /** The user's reply, when this step runs after an "ask". */
  answer?: string;
};

export type WorkflowStep = {
  id: string;
  run: (context: StepContext) => Promise<StepResult>;
};

export type WorkflowDefinition = {
  name: string;
  steps: WorkflowStep[];
};

export type WorkflowRun = {
  id: string;
  conversationId: string;
  workflowName: string;
  stepIndex: number;
  data: WorkflowData;
  status: "awaiting_input" | "done" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
};