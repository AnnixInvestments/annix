import type { mongo } from "mongoose";

const COLLECTION = "tier_invite";

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
        `[migration] Atlas collection cap reached — deferring ${COLLECTION} and its indexes until capacity is freed (#324).`,
      );
      return;
    }
    if (!collectionAlreadyExists(error)) {
      throw error;
    }
  }
  await db.collection(COLLECTION).createIndex({ token: 1 }, { unique: true, name: "token_1" });
  await db.collection(COLLECTION).createIndex({ moduleKey: 1, email: 1 }, { name: "module_email" });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex("token_1")
    .catch(() => undefined);
  await db
    .collection(COLLECTION)
    .dropIndex("module_email")
    .catch(() => undefined);
};
