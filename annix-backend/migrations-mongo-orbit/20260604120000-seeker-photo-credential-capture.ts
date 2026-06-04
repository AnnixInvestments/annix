import type { mongo } from "mongoose";

const TIER_COLLECTION = "cv_assistant_tier_capabilities";
const DOC_COLLECTION = "cv_assistant_individual_documents";

const ENABLED_TIERS = ["medium", "hard"];

export const up = async (db: mongo.Db): Promise<void> => {
  const tiers = db.collection(TIER_COLLECTION);
  const now = new Date();
  await Promise.all(
    ENABLED_TIERS.map((tier) =>
      tiers.updateOne(
        { tier },
        { $set: { "features.photoCredentialCapture": true, updatedAt: now } },
      ),
    ),
  );

  await db
    .collection(DOC_COLLECTION)
    .createIndex(
      { isPhotoCapture: 1, needsClearScan: 1 },
      { name: "idx_photo_pending_clear_scan" },
    );
};

export const down = async (db: mongo.Db): Promise<void> => {
  const tiers = db.collection(TIER_COLLECTION);
  const now = new Date();
  await Promise.all(
    ENABLED_TIERS.map((tier) =>
      tiers.updateOne(
        { tier },
        { $unset: { "features.photoCredentialCapture": "" }, $set: { updatedAt: now } },
      ),
    ),
  );

  await db
    .collection(DOC_COLLECTION)
    .dropIndex("idx_photo_pending_clear_scan")
    .catch(() => undefined);
};
