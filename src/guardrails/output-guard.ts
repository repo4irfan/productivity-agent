import type { TurnTrace } from "../observability/tracer";
import { MUTATING_TOOLS } from "./tool-policy";

const ACTION_CLAIM =
  /\bI(?:'ve| have)\s+(?:successfully\s+)?(?:marked|completed|created|added|deleted|removed|updated|changed|saved|remembered)\b/i;

/**
 * If the reply claims an action was performed but no mutating tool
 * succeeded this turn, the claim is false. Replace it.
 */
export function checkOutput(reply: string, trace: TurnTrace | undefined): string {
  if (!ACTION_CLAIM.test(reply)) {
    return reply;
  }

  const performedMutation = (trace?.spans ?? []).some(
    (span) => span.kind === "tool" && MUTATING_TOOLS.has(span.name) && span.ok && span.data?.["success"] === true
  );

  if (performedMutation) {
    return reply;
  }

  return "I was about to describe an action I hadn't actually performed. Nothing has been changed. Could you rephrase what you'd like me to do?";
}