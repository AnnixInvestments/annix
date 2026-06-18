import type { mongo } from "mongoose";

// Job-ingestion storage indexes (issue #337 follow-up). All createIndex calls are
// idempotent and forward-only against the Orbit cluster's autoIndex:false
// collections.
const MATCHES_COLLECTION = "cv_assistant_candidate_job_matches";
const EXTERNAL_JOBS_COLLECTION = "cv_assistant_external_jobs";

const CANDIDATE_JOB_UNIQUE_INDEX = "candidate_id_external_job_id_unique";
const CANDIDATE_SCORE_INDEX = "candidate_id_overall_score";
const EXTERNAL_JOB_INDEX = "external_job_id";
const LAST_SEEN_AT_INDEX = "last_seen_at";

export const up = async (db: mongo.Db): Promise<void> => {
  const matches = db.collection<{ _id: number }>(MATCHES_COLLECTION);

  const duplicateGroups = await matches
    .aggregate<{ _id: { candidateId: unknown; externalJobId: unknown }; ids: number[] }>([
      {
        $match: {
          candidateId: { $exists: true, $ne: null },
          externalJobId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: { candidateId: "$candidateId", externalJobId: "$externalJobId" },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  const idsToDelete = duplicateGroups.flatMap((group) =>
    [...group.ids].sort((a, b) => a - b).slice(1),
  );

  if (idsToDelete.length > 0) {
    await matches.deleteMany({ _id: { $in: idsToDelete } });
  }

  await matches.createIndex(
    { candidateId: 1, externalJobId: 1 },
    { unique: true, name: CANDIDATE_JOB_UNIQUE_INDEX },
  );
  await matches.createIndex({ candidateId: 1, overallScore: -1 }, { name: CANDIDATE_SCORE_INDEX });
  await matches.createIndex({ externalJobId: 1 }, { name: EXTERNAL_JOB_INDEX });

  await db
    .collection(EXTERNAL_JOBS_COLLECTION)
    .createIndex({ lastSeenAt: 1 }, { name: LAST_SEEN_AT_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  const matches = db.collection(MATCHES_COLLECTION);
  await matches.dropIndex(CANDIDATE_JOB_UNIQUE_INDEX).catch(() => undefined);
  await matches.dropIndex(CANDIDATE_SCORE_INDEX).catch(() => undefined);
  await matches.dropIndex(EXTERNAL_JOB_INDEX).catch(() => undefined);
  await db
    .collection(EXTERNAL_JOBS_COLLECTION)
    .dropIndex(LAST_SEEN_AT_INDEX)
    .catch(() => undefined);
};
