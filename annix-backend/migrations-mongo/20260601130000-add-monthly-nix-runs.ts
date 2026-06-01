import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_tier_capabilities";

const DEFAULTS: { tier: string; monthlyNixRuns: number | null }[] = [
  { tier: "soft", monthlyNixRuns: 3 },
  { tier: "medium", monthlyNixRuns: 10 },
  { tier: "hard", monthlyNixRuns: null },
];

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  await Promise.all(
    DEFAULTS.map((entry) =>
      collection.updateOne(
        { tier: entry.tier, monthlyNixRuns: { $exists: false } },
        { $set: { monthlyNixRuns: entry.monthlyNixRuns } },
      ),
    ),
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).updateMany({}, { $unset: { monthlyNixRuns: "" } });
};
