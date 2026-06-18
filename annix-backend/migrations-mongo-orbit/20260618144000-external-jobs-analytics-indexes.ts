import type { mongo } from "mongoose";

// Analytics / list-shape index parity (architect M3). The TypeORM entity declares
// five @Index sets; only the ones backing live Mongo query shapes are created
// here, to keep storage low on the M0 cluster. Deliberately NOT ported:
//   - idx_external_jobs_location (country, locationArea): no live query filters or
//     sorts on locationArea with country; locationDemand groups on it but a scan
//     of the bounded collection is cheaper than another index on M0.
//   - idx_external_jobs_canonical_province: no live query filters on
//     canonicalProvince (resolveLocation writes it; nothing reads it as a filter).
const EXTERNAL_JOBS_COLLECTION = "cv_assistant_external_jobs";

const SOURCE_CATEGORY_INDEX = "source_id_category";
const COUNTRY_DELISTED_POSTED_INDEX = "country_delisted_posted_at";
const CANONICAL_CATEGORY_INDEX = "canonical_category";

export const up = async (db: mongo.Db): Promise<void> => {
  const jobs = db.collection(EXTERNAL_JOBS_COLLECTION);
  await jobs.createIndex({ sourceId: 1, category: 1 }, { name: SOURCE_CATEGORY_INDEX });
  await jobs.createIndex(
    { country: 1, delisted: 1, postedAt: -1 },
    { name: COUNTRY_DELISTED_POSTED_INDEX },
  );
  await jobs.createIndex({ canonicalCategory: 1 }, { name: CANONICAL_CATEGORY_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  const jobs = db.collection(EXTERNAL_JOBS_COLLECTION);
  await jobs.dropIndex(SOURCE_CATEGORY_INDEX).catch(() => undefined);
  await jobs.dropIndex(COUNTRY_DELISTED_POSTED_INDEX).catch(() => undefined);
  await jobs.dropIndex(CANONICAL_CATEGORY_INDEX).catch(() => undefined);
};
