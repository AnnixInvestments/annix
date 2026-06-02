import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_usage_counters";
const UNIQUE_INDEX = "subject_operation_month_unique";

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
        `[migration] Atlas collection cap reached — deferring ${COLLECTION} and ${UNIQUE_INDEX} until capacity is freed (#324).`,
      );
      return;
    }
    if (!collectionAlreadyExists(error)) {
      throw error;
    }
  }
  await db
    .collection(COLLECTION)
    .createIndex({ subjectId: 1, operation: 1, monthKey: 1 }, { unique: true, name: UNIQUE_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex(UNIQUE_INDEX)
    .catch(() => undefined);
};
