import type { mongo } from "mongoose";

const COLLECTION = "annix_rep_voice_profiles";
const USER_ID_INDEX = "userId_1";

const atlasCollectionCapReached = (error: unknown): boolean =>
  error instanceof Error &&
  error.message.includes("already using") &&
  error.message.includes("collections of");

export const up = async (db: mongo.Db): Promise<void> => {
  try {
    await db.createCollection(COLLECTION);
  } catch (error) {
    if (atlasCollectionCapReached(error)) {
      console.warn(
        `[migration] Atlas collection cap reached — deferring ${COLLECTION} and ${USER_ID_INDEX} until capacity is freed (#324).`,
      );
      return;
    }
  }
  await db.collection(COLLECTION).createIndex({ userId: 1 }, { unique: true, name: USER_ID_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex(USER_ID_INDEX)
    .catch(() => undefined);
};
