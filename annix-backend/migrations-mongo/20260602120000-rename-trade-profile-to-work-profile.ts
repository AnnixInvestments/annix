import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_candidates";

interface LegacyTradeProfile {
  shared?: {
    tradeKeys?: unknown[];
    yearsExperience?: number | null;
    commoditiesWorked?: unknown[];
    siteRadiusKm?: number | null;
    availability?: string | null;
  };
}

function deriveFields(legacy: LegacyTradeProfile): string[] {
  const shared = legacy.shared ?? {};
  const hasTrades = Array.isArray(shared.tradeKeys) && shared.tradeKeys.length > 0;
  const hasCommodities =
    Array.isArray(shared.commoditiesWorked) && shared.commoditiesWorked.length > 0;
  const fields: string[] = [];
  if (hasTrades) fields.push("skilled-trades");
  if (hasCommodities) fields.push("mining-resources");
  return fields;
}

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  const cursor = collection.find({ tradeProfile: { $exists: true } });

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) continue;
    const legacy = (doc.tradeProfile ?? {}) as LegacyTradeProfile;
    const shared = legacy.shared ?? {};
    const workProfile = {
      shared: {
        fields: deriveFields(legacy),
        primaryRole: null,
        yearsExperience: typeof shared.yearsExperience === "number" ? shared.yearsExperience : null,
        availability: shared.availability ?? null,
        willingToTravelKm: typeof shared.siteRadiusKm === "number" ? shared.siteRadiusKm : null,
        topSkills: [],
        certifications: [],
      },
    };
    await collection.updateOne(
      { _id: doc._id },
      { $set: { workProfile }, $unset: { tradeProfile: "" } },
    );
  }
};

export const down = async (_db: mongo.Db): Promise<void> => {
  // The mining-specific detail (commodities, shutdown history, per-trade fields) is
  // dropped by `up`, so a faithful reverse is not possible. No-op.
};
