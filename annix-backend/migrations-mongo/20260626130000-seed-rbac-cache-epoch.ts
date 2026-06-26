import type { mongo } from "mongoose";

const EPOCH_COLLECTION = "_rbac_cache_epoch";
const EPOCH_DOC_ID = "rbac";

export const up = async (db: mongo.Db): Promise<void> => {
  const existing = await db.listCollections({ name: EPOCH_COLLECTION }).toArray();
  if (existing.length === 0) {
    await db.createCollection(EPOCH_COLLECTION);
  }
  await db
    .collection<{ _id: string; epoch: number }>(EPOCH_COLLECTION)
    .updateOne({ _id: EPOCH_DOC_ID }, { $setOnInsert: { epoch: 0 } }, { upsert: true });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(EPOCH_COLLECTION)
    .drop()
    .catch(() => null);
};
