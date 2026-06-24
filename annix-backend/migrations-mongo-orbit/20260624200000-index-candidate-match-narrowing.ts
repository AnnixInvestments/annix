import type { mongo } from "mongoose";

// Perf #396 finding 5: the candidate→job scan's filtered branch now streams the
// matching jobs and their embedding via a single aggregation join (replacing the
// unbounded `eligibleJobIds` all-ids-then-`$in`). Its `$match` runs against
// cv_assistant_external_jobs on { canonicalCategory ∈ pool, country ∈
// targetCountries }. A single-field canonicalCategory index already exists; this
// compound (canonicalCategory, country) lets that `$match` use one index for both
// equalities instead of filtering country in memory (autoIndex is off on this
// cluster, so the index must be created explicitly).
const JOBS_COLLECTION = "cv_assistant_external_jobs";
const JOBS_CATEGORY_COUNTRY_INDEX = "idx_cv_assistant_external_jobs_category_country";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(JOBS_COLLECTION)
    .createIndex({ canonicalCategory: 1, country: 1 }, { name: JOBS_CATEGORY_COUNTRY_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(JOBS_COLLECTION)
    .dropIndex(JOBS_CATEGORY_COUNTRY_INDEX)
    .catch(() => undefined);
};
