import type { mongo } from "mongoose";

// Stamp geocodeAttemptedAt on external jobs that already have coordinates, so the
// new jobsMissingCoords(geocodeAttemptedAt == null) queue doesn't re-geocode them
// against the paid API after this ships. Idempotent; uses server $$NOW.

const COLLECTION = "cv_assistant_external_jobs";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).updateMany(
    {
      locationLat: { $ne: null },
      $or: [{ geocodeAttemptedAt: { $exists: false } }, { geocodeAttemptedAt: null }],
    },
    [{ $set: { geocodeAttemptedAt: "$$NOW" } }],
  );
};

export const down = async (_db: mongo.Db): Promise<void> => {
  // Forward-only: leave geocodeAttemptedAt stamped.
};
