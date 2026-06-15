import type { mongo } from "mongoose";

// Issue #363 — multi-language marketing site. Initialise the additive
// per-locale content maps on the marketing_site_content singleton so the
// document shape is explicit. The service tolerates their absence, so this
// is purely cosmetic/forward-compatible. Self-contained and idempotent.
//
// IMPORTANT: each field is initialised INDEPENDENTLY and ONLY when missing.
// The earlier version matched docs where *either* field was absent and then
// `$set` reset BOTH to {} — which destroyed already-saved translations when a
// doc had draftTranslations populated but publishedTranslations not yet set.
// Never overwrite a populated map here.

const COLLECTION = "marketing_site_content";

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  const draftResult = await collection.updateMany(
    { draftTranslations: { $exists: false } },
    { $set: { draftTranslations: {} } },
  );
  const publishedResult = await collection.updateMany(
    { publishedTranslations: { $exists: false } },
    { $set: { publishedTranslations: {} } },
  );
  console.log(
    `${COLLECTION}: initialised draftTranslations on ${draftResult.modifiedCount}, publishedTranslations on ${publishedResult.modifiedCount} document(s)`,
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  await collection.updateMany({}, { $unset: { draftTranslations: "", publishedTranslations: "" } });
};
