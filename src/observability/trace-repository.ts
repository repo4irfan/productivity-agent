import { db } from "../repositories/task-repository";
import type { TurnTrace } from "./tracer";

const tracesCollection = db.collection<TurnTrace>("traces");

export async function saveTrace(trace: TurnTrace): Promise<void> {
  await tracesCollection.insertOne(trace);
}

export async function listRecentTraces(limit = 20): Promise<TurnTrace[]> {
  return tracesCollection.find().sort({ startedAt: -1 }).limit(limit).toArray();
}