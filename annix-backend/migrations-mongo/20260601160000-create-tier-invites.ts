import type { mongo } from "mongoose";

const COLLECTION = "tier_invite";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.createCollection(COLLECTION).catch(() => undefined);
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
