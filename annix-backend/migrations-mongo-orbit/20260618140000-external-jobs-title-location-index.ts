import type { mongo } from "mongoose";

const EXTERNAL_JOBS_COLLECTION = "cv_assistant_external_jobs";
const TITLE_LOCATION_INDEX = "title_location_area";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(EXTERNAL_JOBS_COLLECTION)
    .createIndex({ title: 1, locationArea: 1 }, { name: TITLE_LOCATION_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(EXTERNAL_JOBS_COLLECTION)
    .dropIndex(TITLE_LOCATION_INDEX)
    .catch(() => undefined);
};
