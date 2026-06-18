import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_job_analysis_cache";
const INDEX_NAME = "ttl_job_analysis_cache_updated_at";
const NINETY_DAYS_SECONDS = 7776000;

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .createIndex({ updatedAt: 1 }, { name: INDEX_NAME, expireAfterSeconds: NINETY_DAYS_SECONDS });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex(INDEX_NAME)
    .catch(() => undefined);
};
