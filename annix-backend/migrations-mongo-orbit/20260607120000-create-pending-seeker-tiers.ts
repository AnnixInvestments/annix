import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_pending_seeker_tiers";

export const up = async (db: mongo.Db): Promise<void> => {
  const existing = await db.listCollections({ name: COLLECTION }).toArray();
  if (existing.length === 0) {
    await db.createCollection(COLLECTION);
  }
  await db
    .collection(COLLECTION)
    .createIndex({ emailNormalized: 1 }, { name: "idx_pending_seeker_tier_email", unique: true });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .drop()
    .catch(() => undefined);
};
