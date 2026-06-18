import type { mongo } from "mongoose";

const EXTERNAL_JOBS_COLLECTION = "cv_assistant_external_jobs";
const COUNTRY_TITLE_KEY_INDEX = "country_title_key";
const BATCH = 500;

function normaliseTitleKey(title: string | null | undefined): string {
  if (!title) return "";
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

export const up = async (db: mongo.Db): Promise<void> => {
  const jobs = db.collection(EXTERNAL_JOBS_COLLECTION);

  const cursor = jobs.find(
    { $or: [{ titleKey: null }, { titleKey: { $exists: false } }] },
    { projection: { title: 1 } },
  );

  let ops: mongo.AnyBulkWriteOperation[] = [];
  for await (const job of cursor) {
    const titleKey = normaliseTitleKey(typeof job.title === "string" ? job.title : null);
    ops.push({
      updateOne: { filter: { _id: job._id }, update: { $set: { titleKey } } },
    });
    if (ops.length >= BATCH) {
      await jobs.bulkWrite(ops);
      ops = [];
    }
  }
  if (ops.length > 0) {
    await jobs.bulkWrite(ops);
  }

  await jobs.createIndex({ country: 1, titleKey: 1 }, { name: COUNTRY_TITLE_KEY_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(EXTERNAL_JOBS_COLLECTION)
    .dropIndex(COUNTRY_TITLE_KEY_INDEX)
    .catch(() => undefined);
};
