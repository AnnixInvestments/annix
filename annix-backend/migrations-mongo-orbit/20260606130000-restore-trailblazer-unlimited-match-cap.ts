import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_tier_capabilities";
const TRAILBLAZER_TIER = "hard";
const EMERGENCY_CAP = 150;

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .updateOne(
      { tier: TRAILBLAZER_TIER },
      { $set: { maxJobResults: null, updatedAt: new Date() } },
    );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .updateOne(
      { tier: TRAILBLAZER_TIER },
      { $set: { maxJobResults: EMERGENCY_CAP, updatedAt: new Date() } },
    );
};
