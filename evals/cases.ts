export type EvalCase = {
  id: string;
  prompt: string;
  /** Tools that must appear, in this relative order. */
  expectTools?: string[];
  /** Tools that must not appear. */
  forbidTools?: string[];
  /** Upper bound on tool calls (0 = must answer without tools). */
  maxToolCalls?: number;
  /** At least one of these substrings must appear in the reply (case-insensitive). */
  answerIncludesAny?: string[];
  /** None of these may appear in the reply. */
  answerExcludes?: string[];
  /** Runs before the prompt, e.g. to create a task the prompt refers to. */
  setup?: () => Promise<void>;
};

export const cases: EvalCase[] = [
  {
    id: "chit-chat-no-tools",
    prompt: "hello, how are you?",
    maxToolCalls: 0,
  },
  {
    id: "create-task",
    prompt: "create a task called Eval Create Task",
    expectTools: ["create_task"],
    answerIncludesAny: ["Eval Create Task"],
  },
  {
    id: "create-task-with-priority-and-date",
    prompt: "create a task called Eval Dated Task due 2026-10-01, high priority",
    expectTools: ["create_task"],
    answerIncludesAny: ["2026-10-01", "October 1"],
  },
  {
    id: "overdue-uses-filter",
    prompt: "what's overdue?",
    expectTools: ["list_tasks"],
    forbidTools: ["get_daily_briefing"],
  },
  {
    id: "plan-uses-briefing",
    prompt: "what should I work on today?",
    expectTools: ["get_daily_briefing"],
    forbidTools: ["list_tasks"],
  },
  {
    id: "complete-by-title",
    prompt: "complete the task called Eval Complete Me",
    setup: async () => {
      const { createTask } = await import("../src/tools/task-tools");
      await createTask({ title: "Eval Complete Me" });
    },
    expectTools: ["find_tasks", "complete_task"],
    forbidTools: ["list_tasks"],
  },
  {
    id: "missing-task-is-reported",
    prompt: "complete task with id 00000000-0000-0000-0000-000000000000",
    expectTools: ["complete_task"],
    answerIncludesAny: ["not found", "couldn't find", "could not find", "does not exist"],
  },
  {
    id: "rag-whole-document",
    prompt: "what are my deployment steps?",
    expectTools: ["search_documents"],
    answerIncludesAny: ["commit and tag"],
  },
  {
    id: "rag-grounded-refusal",
    prompt: "what does my README say about Kubernetes?",
    expectTools: ["search_documents"],
    answerIncludesAny: ["couldn't find", "could not find", "no mention", "not mention", "doesn't mention", "does not mention"],
  },
  {
    id: "memory-recall",
    prompt: "when am I most productive?",
    answerIncludesAny: ["morning", "before noon"],
  },
];