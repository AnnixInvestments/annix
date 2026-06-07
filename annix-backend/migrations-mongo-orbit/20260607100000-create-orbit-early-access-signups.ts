import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_early_access_signups";

export const up = async (db: mongo.Db): Promise<void> => {
  const existing = await db.listCollections({ name: COLLECTION }).toArray();
  if (existing.length === 0) {
    await db.createCollection(COLLECTION);
  }
  await db
    .collection(COLLECTION)
    .createIndex({ emailNormalized: 1 }, { name: "idx_orbit_early_access_email", unique: true });
  await db
    .collection(COLLECTION)
    .createIndex({ mobileNormalized: 1 }, { name: "idx_orbit_early_access_mobile", unique: true });
  await db
    .collection(COLLECTION)
    .createIndex(
      { referralCode: 1 },
      { name: "idx_orbit_early_access_referral_code", unique: true },
    );
  await db
    .collection(COLLECTION)
    .createIndex({ createdAt: -1 }, { name: "idx_orbit_early_access_created_at" });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .drop()
    .catch(() => undefined);
};
