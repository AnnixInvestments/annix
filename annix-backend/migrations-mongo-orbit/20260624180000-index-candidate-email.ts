import type { mongo } from "mongoose";

// Perf #396 finding 1: cv_assistant_candidates.email is queried on essentially
// every seeker request (findByEmail via candidatesForSeeker — feed, stats,
// facets, consent, quota, mute, rematch, dismiss) but had no index, forcing a
// COLLSCAN of the whole candidate collection per request. Non-unique because a
// person can have multiple candidate records (one per job application).
const COLLECTION = "cv_assistant_candidates";
const INDEX_NAME = "idx_cv_assistant_candidates_email";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).createIndex({ email: 1 }, { name: INDEX_NAME });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex(INDEX_NAME)
    .catch(() => undefined);
};
