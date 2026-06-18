import type { mongo } from "mongoose";

const MATCHES = "cv_assistant_candidate_job_matches";
const BATCH_SIZE = 5_000;

// M4: the matchDetails.reasoning prose was being persisted on every match row
// (up to 25k rows per candidate). It is fully regenerable from the stored
// numeric/structured fields and is now rendered on read, so strip it from the
// existing rows to reclaim the storage. Batched + idempotent: each pass clears
// up to BATCH_SIZE rows that still carry the field, looping until none remain.
export const up = async (db: mongo.Db): Promise<void> => {
  const matches = db.collection(MATCHES);
  let cleared = 0;
  do {
    const batch = await matches
      .find({ "matchDetails.reasoning": { $exists: true } }, { projection: { _id: 1 } })
      .limit(BATCH_SIZE)
      .toArray();
    if (batch.length === 0) {
      cleared = 0;
    } else {
      const ids = batch.map((row) => row._id);
      const result = await matches.updateMany(
        { _id: { $in: ids } },
        { $unset: { "matchDetails.reasoning": "" } },
      );
      cleared = result.modifiedCount ?? 0;
    }
  } while (cleared > 0);
};

// No-op: matchDetails.reasoning is regenerable prose rendered on read from the
// stored numeric scores, so there is nothing to restore on a rollback.
export const down = async (): Promise<void> => {};
