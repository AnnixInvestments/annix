import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_usage_counters";
const UNIQUE_INDEX = "subject_operation_month_unique";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.createCollection(COLLECTION).catch(() => undefined);
  await db
    .collection(COLLECTION)
    .createIndex({ subjectId: 1, operation: 1, monthKey: 1 }, { unique: true, name: UNIQUE_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex(UNIQUE_INDEX)
    .catch(() => undefined);
};
