import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_tier_capabilities";

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  await collection.updateOne({ tier: "hard" }, { $set: { label: "Heavy" } });
  await collection.updateMany(
    { tier: { $ne: "hard" } },
    { $set: { "features.jobListingSite": false } },
  );
  await collection.updateOne({ tier: "hard" }, { $set: { "features.jobListingSite": true } });
};

export const down = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  await collection.updateOne({ tier: "hard" }, { $set: { label: "Hard" } });
  await collection.updateMany({}, { $unset: { "features.jobListingSite": "" } });
};
