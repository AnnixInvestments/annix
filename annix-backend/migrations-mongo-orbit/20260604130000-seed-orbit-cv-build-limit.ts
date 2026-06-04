import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_tier_capabilities";

const CV_BUILD_LIMITS: Record<string, number | null> = {
  soft: 0,
  medium: 4,
  hard: null,
};

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  await Promise.all(
    Object.entries(CV_BUILD_LIMITS).map(([tier, monthlyCvBuilds]) =>
      collection.updateOne(
        { tier, monthlyCvBuilds: { $exists: false } },
        { $set: { monthlyCvBuilds } },
      ),
    ),
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).updateMany({}, { $unset: { monthlyCvBuilds: "" } });
};
