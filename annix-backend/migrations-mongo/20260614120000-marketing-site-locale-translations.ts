import type { mongo } from "mongoose";

// Issue #363 — multi-language marketing site. Initialise the additive
// per-locale content maps on the marketing_site_content singleton so the
// document shape is explicit. The service tolerates their absence, so this
// is purely cosmetic/forward-compatible. Self-contained and idempotent.

const COLLECTION = "marketing_site_content";

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  const result = await collection.updateMany(
    {
      $or: [
        { draftTranslations: { $exists: false } },
        { publishedTranslations: { $exists: false } },
      ],
    },
    { $set: { draftTranslations: {}, publishedTranslations: {} } },
  );
  console.log(`${COLLECTION}: initialised locale maps on ${result.modifiedCount} document(s)`);
};

export const down = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  await collection.updateMany({}, { $unset: { draftTranslations: "", publishedTranslations: "" } });
};
