import { db } from "./task-repository";
import type { AgentMessage } from "../agents/agent-state";

export type Conversation = {
  id: string;
  messages: AgentMessage[];
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
};

const conversationsCollection =
  db.collection<Conversation>("conversations");

export async function createConversation(): Promise<Conversation> {
  const now = new Date();

  const conversation: Conversation = {
    id: crypto.randomUUID(),
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  await conversationsCollection.insertOne(conversation);

  return conversation;
}

export async function getConversation(
  id: string
): Promise<Conversation | null> {
  return conversationsCollection.findOne({ id });
}

export async function saveConversation(
  conversation: Conversation
): Promise<void> {
  await conversationsCollection.updateOne(
    { id: conversation.id },
    {
      $set: {
        messages: conversation.messages,
        summary: conversation.summary,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}