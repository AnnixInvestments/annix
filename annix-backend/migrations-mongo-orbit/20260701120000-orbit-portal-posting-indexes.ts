import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_job_posting_portal_postings";
const UNIQUE_INDEX = "job_posting_portal_unique";
const RETRY_INDEX = "status_next_retry_at";

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection<{ _id: number }>(COLLECTION);

  // Collapse any pre-existing duplicate (jobPostingId, portalCode) rows before
  // enforcing the unique index — keep the lowest _id in each group. The
  // orchestrator's findByJobAndPortal-or-create assumes one row per pair.
  const duplicateGroups = await collection
    .aggregate<{ _id: { jobPostingId: unknown; portalCode: unknown }; ids: number[] }>([
      {
        $match: {
          jobPostingId: { $exists: true, $ne: null },
          portalCode: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: { jobPostingId: "$jobPostingId", portalCode: "$portalCode" },
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
    await collection.deleteMany({ _id: { $in: idsToDelete } });
  }

  // One row per (job, channel) — also the target for findByJobAndPortal.
  await collection.createIndex(
    { jobPostingId: 1, portalCode: 1 },
    { unique: true, name: UNIQUE_INDEX },
  );
  // Retry sweep: findRetryDue filters status + sorts by nextRetryAt.
  await collection.createIndex({ status: 1, nextRetryAt: 1 }, { name: RETRY_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).dropIndex(UNIQUE_INDEX);
  await db.collection(COLLECTION).dropIndex(RETRY_INDEX);
};
