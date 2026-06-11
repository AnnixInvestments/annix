import type { mongo } from "mongoose";

const CONVERSATIONS = "whatsapp_conversations";
const MESSAGES = "whatsapp_messages";
const WA_ID_INDEX = "waId_1";
const RECENCY_INDEX = "lastMessageAt_-1";
const CONVERSATION_SENT_INDEX = "conversationId_1_sentAt_-1";
const WA_MESSAGE_ID_INDEX = "waMessageId_1";

const atlasCollectionCapReached = (error: unknown): boolean =>
  error instanceof Error &&
  error.message.includes("already using") &&
  error.message.includes("collections of");

export const up = async (db: mongo.Db): Promise<void> => {
  try {
    await db.createCollection(CONVERSATIONS);
    await db.createCollection(MESSAGES);
  } catch (error) {
    if (atlasCollectionCapReached(error)) {
      console.warn(
        "[migration] Atlas collection cap reached — deferring WhatsApp collections until capacity is freed (#324).",
      );
      return;
    }
  }

  await db.collection(CONVERSATIONS).createIndex({ waId: 1 }, { unique: true, name: WA_ID_INDEX });
  await db.collection(CONVERSATIONS).createIndex({ lastMessageAt: -1 }, { name: RECENCY_INDEX });
  await db
    .collection(MESSAGES)
    .createIndex({ conversationId: 1, sentAt: -1 }, { name: CONVERSATION_SENT_INDEX });
  await db
    .collection(MESSAGES)
    .createIndex({ waMessageId: 1 }, { sparse: true, name: WA_MESSAGE_ID_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(CONVERSATIONS)
    .dropIndex(WA_ID_INDEX)
    .catch(() => undefined);
  await db
    .collection(CONVERSATIONS)
    .dropIndex(RECENCY_INDEX)
    .catch(() => undefined);
  await db
    .collection(MESSAGES)
    .dropIndex(CONVERSATION_SENT_INDEX)
    .catch(() => undefined);
  await db
    .collection(MESSAGES)
    .dropIndex(WA_MESSAGE_ID_INDEX)
    .catch(() => undefined);
};
