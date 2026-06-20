import type { mongo } from "mongoose";

const MATCHES = "cv_assistant_candidate_job_matches";
const JOBS = "cv_assistant_external_jobs";

const chunked = <T>(items: T[], size: number): T[][] => {
  const groups: T[][] = [];
  return items.reduce((acc, item, index) => {
    if (index % size === 0) {
      acc.push([item]);
    } else {
      acc[acc.length - 1].push(item);
    }
    return acc;
  }, groups);
};

const purgeOrphanMatches = async (db: mongo.Db): Promise<number> => {
  const orphans = await db
    .collection(MATCHES)
    .aggregate(
      [
        { $group: { _id: "$externalJobId" } },
        { $lookup: { from: JOBS, localField: "_id", foreignField: "_id", as: "job" } },
        { $match: { "job.0": { $exists: false } } },
        { $project: { _id: 1 } },
      ],
      { allowDiskUse: true },
    )
    .toArray();
  const jobIds = orphans.map((row) => row._id);
  if (jobIds.length === 0) return 0;
  return chunked(jobIds, 5000).reduce(async (prev, batch) => {
    const acc = await prev;
    const result = await db.collection(MATCHES).deleteMany({ externalJobId: { $in: batch } });
    return acc + (result.deletedCount ?? 0);
  }, Promise.resolve(0));
};

const dropDuplicateMatchIndex = async (db: mongo.Db): Promise<void> => {
  const indexes = await db.collection(MATCHES).indexes();
  const onKey = indexes.filter((index) => {
    const key = index.key as Record<string, number>;
    return key && key.candidateId === 1 && key.externalJobId === 1 && Object.keys(key).length === 2;
  });
  if (onKey.length <= 1) return;
  const keep = onKey.find((index) => index.unique) ?? onKey[0];
  const drops = onKey.filter((index) => index.name !== keep.name);
  await drops.reduce(async (prev, index) => {
    await prev;
    if (index.name) {
      await db
        .collection(MATCHES)
        .dropIndex(index.name)
        .catch(() => undefined);
    }
  }, Promise.resolve());
};

export const up = async (db: mongo.Db): Promise<void> => {
  await purgeOrphanMatches(db);
  await dropDuplicateMatchIndex(db);
};

export const down = async (): Promise<void> => {
  // Forward-only: orphan match rows pointed at deleted jobs and cannot be
  // reconstructed; the dropped index was a redundant duplicate of the unique
  // (candidateId, externalJobId) index that remains in place.
};
