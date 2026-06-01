import type { mongo } from "mongoose";

const COLLECTION = "promo_code";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .updateMany({ grantsTier: { $exists: false } }, { $set: { grantsTier: null } });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).updateMany({}, { $unset: { grantsTier: "" } });
};
