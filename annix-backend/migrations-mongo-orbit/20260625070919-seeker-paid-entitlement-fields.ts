import type { mongo } from "mongoose";

// Issue #398 finding #1: paid-vs-entitled separation for seeker tiers. Adds the
// minimal entitlement shape to every existing seeker profile so gating can read
// an explicit entitlement (entitledTier) + billing state instead of the
// self-served selectedTier. Each field is backfilled only where it is missing,
// so the migration is idempotent and safe to re-run. selectedTier (intent) is
// left untouched. Lives in the Orbit cluster (cv_assistant_profiles).

const COLLECTION = "cv_assistant_profiles";

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  await collection.updateMany(
    { entitledTier: { $exists: false } },
    { $set: { entitledTier: "soft" } },
  );
  await collection.updateMany(
    { billingStatus: { $exists: false } },
    { $set: { billingStatus: "none" } },
  );
  await collection.updateMany({ paidUntil: { $exists: false } }, { $set: { paidUntil: null } });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .updateMany({}, { $unset: { entitledTier: "", billingStatus: "", paidUntil: "" } });
};
