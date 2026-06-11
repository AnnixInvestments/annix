import type { mongo } from "mongoose";

const RETENTION_CAP = 3000;

const JOBS = "cv_assistant_external_jobs";
const MATCHES = "cv_assistant_candidate_job_matches";
const ALTERNATES = "cv_assistant_external_job_alternates";

export const up = async (db: mongo.Db): Promise<void> => {
  const jobs = db.collection<{ _id: number }>(JOBS);

  const total = await jobs.countDocuments({});
  if (total > RETENTION_CAP) {
    const keep = await jobs
      .find({}, { projection: { _id: 1 } })
      .sort({ _id: -1 })
      .limit(RETENTION_CAP)
      .toArray();
    const keepIds = keep.map((doc) => doc._id);
    await jobs.deleteMany({ _id: { $nin: keepIds } });
  }

  const remaining = await jobs.find({}, { projection: { _id: 1 } }).toArray();
  const remainingIds = remaining.map((doc) => doc._id);

  await db.collection(MATCHES).deleteMany({ externalJobId: { $nin: remainingIds } });
  await db.collection(ALTERNATES).deleteMany({
    $and: [
      { canonicalExternalJobId: { $nin: remainingIds } },
      { canonicalJobId: { $nin: remainingIds } },
    ],
  });
};

export const down = async (_db: mongo.Db): Promise<void> => {
  // Forward-only: deleted external jobs cannot be restored.
};
