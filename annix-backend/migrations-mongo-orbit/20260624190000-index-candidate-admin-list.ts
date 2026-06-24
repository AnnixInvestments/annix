import type { mongo } from "mongoose";

// Perf #396 finding 4: the admin seeker list (listNonFixture) filters
// { isTestFixture: false }, sorts { createdAt: -1 } and countDocuments() the same
// filter, with no backing index → COLLSCAN + in-memory sort on every admin list
// page. This compound index backs the filter + sort + count. The optional
// unanchored $or regex on email/name still scans the (already index-narrowed)
// subset — the intended trade-off.
const COLLECTION = "cv_assistant_candidates";
const INDEX_NAME = "idx_cv_assistant_candidates_fixture_created";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .createIndex({ isTestFixture: 1, createdAt: -1 }, { name: INDEX_NAME });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex(INDEX_NAME)
    .catch(() => undefined);
};
