import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_tier_capabilities";

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  const now = new Date();
  await collection.updateMany(
    { tier: { $ne: "hard" } },
    { $set: { "features.multiChannelReminders": false, updatedAt: now } },
  );
  await collection.updateOne(
    { tier: "hard" },
    { $set: { "features.multiChannelReminders": true, updatedAt: now } },
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .updateMany({}, { $unset: { "features.multiChannelReminders": "" } });
};
