import type { mongo } from "mongoose";

const COUNTERS = "ai_quota_counters";
const USAGE = "ai_usage_logs";

export const up = async (db: mongo.Db): Promise<void> => {
  const existing = await db.listCollections({ name: COUNTERS }).toArray();
  if (existing.length === 0) {
    await db.createCollection(COUNTERS);
  }
  await db
    .collection(COUNTERS)
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" });
  await db.collection(USAGE).createIndex({ createdAt: 1 }, { name: "createdAt_idx" });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(USAGE)
    .dropIndex("createdAt_idx")
    .catch(() => null);
  await db
    .collection(COUNTERS)
    .drop()
    .catch(() => null);
};
