import type { mongo } from "mongoose";

const COLLECTION = "annix_rep_voice_profiles";
const USER_ID_INDEX = "userId_1";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.createCollection(COLLECTION).catch(() => undefined);
  await db.collection(COLLECTION).createIndex({ userId: 1 }, { unique: true, name: USER_ID_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex(USER_ID_INDEX)
    .catch(() => undefined);
};
