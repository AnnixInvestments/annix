import type { mongo } from "mongoose";

const COLLECTION = "auth_login_attempts";
const INDEX_NAME = "auth_login_attempts_ttl";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .createIndex({ expiresAt: 1 }, { name: INDEX_NAME, expireAfterSeconds: 0 });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).dropIndex(INDEX_NAME);
};
