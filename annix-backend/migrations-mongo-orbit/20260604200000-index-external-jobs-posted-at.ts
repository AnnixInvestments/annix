import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_external_jobs";
const INDEX_NAME = "idx_external_jobs_posted_at";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).createIndex({ postedAt: -1 }, { name: INDEX_NAME });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex(INDEX_NAME)
    .catch(() => undefined);
};
