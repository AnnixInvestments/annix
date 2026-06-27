import type { mongo } from "mongoose";

// Compound index for the hot Nix-learning prompt reads. The seven `findActive*`
// reads in nix-learning.repository.mongo.ts filter on
// { learningType, category, isActive } (the `quarantined: { $ne: true }` lane
// guard is a low-selectivity residual) and sort by `confidence` descending —
// two of them (`findActiveCorrectionsByCategoryOrderedByConfidence`,
// `findActiveCorrectionByPatternKeyAndCategory`) sort by the two-key
// `{ confidence: -1, confirmationCount: -1 }`. Including both sort keys lets the
// index serve the full sort (no blocking in-memory sort). Without an index these
// are full collection scans on M0. The key order matches the equality fields
// first, then the sort fields. autoIndex is off in this app, so the index must
// be built here rather than by Mongoose.
const COLLECTION = "nix_learning";
const INDEX_NAME = "nix_learning_active_correction";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .createIndex(
      { learningType: 1, category: 1, isActive: 1, confidence: -1, confirmationCount: -1 },
      { name: INDEX_NAME },
    );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex(INDEX_NAME)
    .catch(() => undefined);
};
