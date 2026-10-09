import { listTasks, listCompletedSince } from "../repositories/task-repository";
import { remember } from "../tools/memory-tools";
import type { WorkflowDefinition } from "./workflow-types";

export const weeklyReview: WorkflowDefinition = {
  name: "weekly_review",

  steps: [
    {
      id: "gather",
      run: async () => {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [completed, overdue, open] = await Promise.all([
          listCompletedSince(weekAgo),
          listTasks({ due: "overdue" }),
          listTasks({ status: "open" }),
        ]);

        return {
          type: "continue",
          data: {
            completedTitles: completed.map((task) => task.title),
            overdueTitles: overdue.map((task) => task.title),
            openCount: open.length,
          },
        };
      },
    },

    {
      id: "ask-focus",
      run: async ({ data }) => {
        const completed = data["completedTitles"] as string[];
        const overdue = data["overdueTitles"] as string[];

        const lines = [
          `Last week you completed ${completed.length} task(s)${
            completed.length ? `: ${completed.join(", ")}` : ""
          }.`,
          overdue.length
            ? `${overdue.length} are overdue: ${overdue.join(", ")}.`
            : "Nothing is overdue.",
          `You have ${data["openCount"]} open task(s).`,
          "",
          "What is your main focus for next week?",
        ];

        return { type: "ask", question: lines.join("\n") };
      },
    },

    {
      id: "save-focus",
      run: async ({ data, answer }) => {
        const focus = answer?.trim();

        if (!focus || focus.length < 5) {
          return {
            type: "ask",
            repeat: true,
            question: "Could you say a bit more about your focus for next week?",
          };
        }

        await remember(`Focus for the week of ${new Date().toLocaleDateString("en-CA")}: ${focus}`);

        const overdue = data["overdueTitles"] as string[];

        return {
          type: "finish",
          summary: [
            `Noted — your focus for next week is: ${focus}.`,
            overdue.length
              ? `Consider rescheduling or dropping the ${overdue.length} overdue task(s) first.`
              : "You're starting the week with nothing overdue.",
          ].join(" "),
        };
      },
    },
  ],
};