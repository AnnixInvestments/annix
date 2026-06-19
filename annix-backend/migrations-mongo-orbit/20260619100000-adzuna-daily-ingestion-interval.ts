import type { mongo } from "mongoose";

const SOURCES = "cv_assistant_job_market_sources";
const ADZUNA = "adzuna";
const DAILY_INTERVAL_HOURS = 24;
const PREVIOUS_INTERVAL_HOURS = 6;

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(SOURCES)
    .updateMany({ provider: ADZUNA }, { $set: { ingestionIntervalHours: DAILY_INTERVAL_HOURS } });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(SOURCES)
    .updateMany(
      { provider: ADZUNA },
      { $set: { ingestionIntervalHours: PREVIOUS_INTERVAL_HOURS } },
    );
};
