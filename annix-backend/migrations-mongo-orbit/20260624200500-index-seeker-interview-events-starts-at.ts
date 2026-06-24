import type { mongo } from "mongoose";

// Perf #396 finding 14: the 30-minute interview-reminder cron filters
// cv_assistant_seeker_interview_events by a 25h startsAt window
// (startingBetween → { startsAt: { $gt, $lte } }) with no backing index → a
// COLLSCAN every tick. This index makes the window query an IXSCAN.
const COLLECTION = "cv_assistant_seeker_interview_events";
const INDEX_NAME = "idx_cv_assistant_seeker_interview_events_starts_at";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).createIndex({ startsAt: 1 }, { name: INDEX_NAME });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex(INDEX_NAME)
    .catch(() => undefined);
};
