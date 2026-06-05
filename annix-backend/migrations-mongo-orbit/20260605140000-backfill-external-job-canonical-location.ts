import type { mongo } from "mongoose";
import { resolveLocation } from "../src/annix-orbit/lib/sa-locations";

const COLLECTION = "cv_assistant_external_jobs";
const BATCH = 500;

export async function up(db: mongo.Db): Promise<void> {
  const jobs = db.collection(COLLECTION);
  const cursor = jobs.find({}, { projection: { locationArea: 1, locationRaw: 1 } });

  let ops: mongo.AnyBulkWriteOperation[] = [];
  for await (const job of cursor) {
    const area = typeof job.locationArea === "string" ? job.locationArea : "";
    const raw = typeof job.locationRaw === "string" ? job.locationRaw : "";
    const { province, city } = resolveLocation(`${area} ${raw}`);
    ops.push({
      updateOne: {
        filter: { _id: job._id },
        update: { $set: { canonicalProvince: province, canonicalCity: city } },
      },
    });
    if (ops.length >= BATCH) {
      await jobs.bulkWrite(ops);
      ops = [];
    }
  }
  if (ops.length > 0) {
    await jobs.bulkWrite(ops);
  }
}

export async function down(): Promise<void> {
  // Forward-only: derived location data, recomputed on next ingest/backfill.
}
