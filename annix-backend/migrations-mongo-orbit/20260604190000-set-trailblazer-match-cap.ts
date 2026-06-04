import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_tier_capabilities";
const TRAILBLAZER_TIER = "hard";
const DEFAULT_MATCH_CAP = 150;

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).updateOne(
    {
      tier: TRAILBLAZER_TIER,
      $or: [{ maxJobResults: null }, { maxJobResults: { $exists: false } }],
    },
    { $set: { maxJobResults: DEFAULT_MATCH_CAP, updatedAt: new Date() } },
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .updateOne(
      { tier: TRAILBLAZER_TIER, maxJobResults: DEFAULT_MATCH_CAP },
      { $set: { maxJobResults: null, updatedAt: new Date() } },
    );
};
