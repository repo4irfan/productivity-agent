import { AsyncLocalStorage } from "node:async_hooks";

export type SpanKind = "llm" | "embed" | "tool" | "retrieval" | "approval";

export type Span = {
  kind: SpanKind;
  name: string;
  durationMs: number;
  ok: boolean;
  data?: Record<string, unknown>;
};

export type TurnTrace = {
  id: string;
  conversationId: string;
  userMessage: string;
  startedAt: Date;
  durationMs: number;
  spans: Span[];
  outcome: "reply" | "failure" | "error";
  reply?: string;
  error?: string;
};

type TraceSink = (trace: TurnTrace) => Promise<void> | void;

const storage = new AsyncLocalStorage<TurnTrace>();

export function currentTrace(): TurnTrace | undefined {
  return storage.getStore();
}

/** Runs fn inside a new trace; records the outcome; hands the trace to sink. */
export async function runTurn<T extends string>(
  conversationId: string,
  userMessage: string,
  fn: () => Promise<T>,
  sink: TraceSink
): Promise<T> {
  const trace: TurnTrace = {
    id: crypto.randomUUID().slice(0, 8),
    conversationId,
    userMessage,
    startedAt: new Date(),
    durationMs: 0,
    spans: [],
    outcome: "reply",
  };

  const started = performance.now();

  try {
    const reply = await storage.run(trace, fn);
    trace.reply = reply;
    return reply;
  } catch (error) {
    trace.outcome = "error";
    trace.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    trace.durationMs = Math.round(performance.now() - started);
    await sink(trace);
  }
}

/** Times fn and records a span on the current trace (no-op outside a turn). */
export async function traced<T>(
  kind: SpanKind,
  name: string,
  fn: () => Promise<T>,
  describe?: (result: T) => Record<string, unknown>
): Promise<T> {
  const trace = currentTrace();
  const started = performance.now();

  try {
    const result = await fn();

    trace?.spans.push({
      kind,
      name,
      durationMs: Math.round(performance.now() - started),
      ok: true,
      data: describe?.(result),
    });

    return result;
  } catch (error) {
    trace?.spans.push({
      kind,
      name,
      durationMs: Math.round(performance.now() - started),
      ok: false,
      data: { error: error instanceof Error ? error.message : String(error) },
    });

    throw error;
  }
}

export function markFailure(reason: string): void {
  const trace = currentTrace();

  if (trace) {
    trace.outcome = "failure";
    trace.error = reason;
  }
}