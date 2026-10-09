import { startWorkflow } from "../workflows/workflow-engine";

export async function startWeeklyReview(conversationId: string) {
  return startWorkflow("weekly_review", conversationId);
}