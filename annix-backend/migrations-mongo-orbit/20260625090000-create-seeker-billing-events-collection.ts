import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_seeker_billing_events";
const USER_CREATED_INDEX = "userId_createdAt";
const EVENT_ID_UNIQUE_INDEX = "paystackEventId_unique";

const atlasCollectionCapReached = (error: unknown): boolean =>
  error instanceof Error &&
  error.message.includes("already using") &&
  error.message.includes("collections of");

const collectionAlreadyExists = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes("already exists") ||
    (error as { codeName?: string }).codeName === "NamespaceExists");

export const up = async (db: mongo.Db): Promise<void> => {
  try {
    await db.createCollection(COLLECTION);
  } catch (error) {
    if (atlasCollectionCapReached(error)) {
      console.warn(
        `[migration] Atlas collection cap reached — deferring ${COLLECTION} and its indexes until capacity is freed.`,
      );
      return;
    }
    if (!collectionAlreadyExists(error)) {
      throw error;
    }
  }
  const collection = db.collection(COLLECTION);
  await collection.createIndex({ userId: 1, createdAt: -1 }, { name: USER_CREATED_INDEX });
  await collection.createIndex(
    { paystackEventId: 1 },
    {
      name: EVENT_ID_UNIQUE_INDEX,
      unique: true,
      partialFilterExpression: { paystackEventId: { $type: "string" } },
    },
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  await collection.dropIndex(USER_CREATED_INDEX).catch(() => undefined);
  await collection.dropIndex(EVENT_ID_UNIQUE_INDEX).catch(() => undefined);
};
