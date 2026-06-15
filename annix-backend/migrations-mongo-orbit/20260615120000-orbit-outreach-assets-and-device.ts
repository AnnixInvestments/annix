import type { mongo } from "mongoose";

const ASSETS_COLLECTION = "cv_assistant_outreach_assets";
const SCHEDULES_COLLECTION = "cv_assistant_outreach_schedules";
const SIGNUPS_COLLECTION = "cv_assistant_early_access_signups";

export const up = async (db: mongo.Db): Promise<void> => {
  const existing = await db.listCollections({ name: ASSETS_COLLECTION }).toArray();
  if (existing.length === 0) {
    await db.createCollection(ASSETS_COLLECTION);
  }
  await db
    .collection(ASSETS_COLLECTION)
    .createIndex({ slot: 1 }, { name: "idx_orbit_outreach_asset_slot" });

  const existingSchedules = await db.listCollections({ name: SCHEDULES_COLLECTION }).toArray();
  if (existingSchedules.length === 0) {
    await db.createCollection(SCHEDULES_COLLECTION);
  }
  await db
    .collection(SCHEDULES_COLLECTION)
    .createIndex({ status: 1, scheduledAt: 1 }, { name: "idx_orbit_outreach_schedule_status" });

  await db
    .collection(SIGNUPS_COLLECTION)
    .updateMany(
      { platform: { $regex: /iphone|ipad|ipod/i }, device: { $in: [null, undefined] } },
      { $set: { device: "iphone" } },
    );
  await db
    .collection(SIGNUPS_COLLECTION)
    .updateMany(
      { platform: { $regex: /android/i }, device: { $in: [null, undefined] } },
      { $set: { device: "android" } },
    );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(ASSETS_COLLECTION)
    .drop()
    .catch(() => undefined);
  await db
    .collection(SCHEDULES_COLLECTION)
    .drop()
    .catch(() => undefined);
  await db
    .collection(SIGNUPS_COLLECTION)
    .updateMany({}, { $unset: { device: "", adminEmailSentAt: "" } });
};
