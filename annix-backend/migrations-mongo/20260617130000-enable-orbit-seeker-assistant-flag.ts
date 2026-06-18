import type { mongo } from "mongoose";

const COLLECTION = "feature_flags";
const FLAG_KEY = "ANNIX_ORBIT_SEEKER_ASSISTANT";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .updateOne({ flagKey: FLAG_KEY }, { $set: { enabled: true } }, { upsert: false });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .updateOne({ flagKey: FLAG_KEY }, { $set: { enabled: false } }, { upsert: false });
};
