import type { mongo } from "mongoose";

// Indexes for the shared throttler counter store (MongoThrottlerStorage). The
// unique `key` index keeps the per-key upsert atomic across app instances; the
// TTL index on `expiresAt` reaps stale windows. autoIndex is off in this app, so
// indexes are created here rather than by Mongoose. createIndex creates the
// collection if it does not yet exist.
const COLLECTION = "throttler_hits";

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .drop()
    .catch(() => undefined);
};
