import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_tier_capabilities";

interface TierPricing {
  monthlyPrice: number | null;
  perNixRun: number | null;
  perCvBuild: number | null;
}

const PRICING: Record<string, TierPricing> = {
  soft: { monthlyPrice: 0, perNixRun: 29, perCvBuild: 59 },
  medium: { monthlyPrice: 99, perNixRun: 19, perCvBuild: null },
  hard: { monthlyPrice: 199, perNixRun: null, perCvBuild: null },
};

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  await Promise.all(
    Object.entries(PRICING).map(([tier, pricing]) =>
      collection.updateOne(
        { tier, $or: [{ pricing: { $exists: false } }, { pricing: null }] },
        { $set: { pricing } },
      ),
    ),
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).updateMany({}, { $unset: { pricing: "" } });
};
