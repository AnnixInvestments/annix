import type { mongo } from "mongoose";

const USER = "user";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(USER).createIndex({ companyId: 1 }, { name: "companyId_idx" });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(USER)
    .dropIndex("companyId_idx")
    .catch(() => null);
};
