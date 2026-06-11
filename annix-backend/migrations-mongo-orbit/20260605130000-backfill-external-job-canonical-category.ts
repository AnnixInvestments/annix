import { matchJobCategoryRuleBased } from "@annix/product-data/sa-market";
import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_external_jobs";
const BATCH = 500;

export async function up(db: mongo.Db): Promise<void> {
  const jobs = db.collection(COLLECTION);
  const cursor = jobs.find(
    {
      $or: [
        { canonicalCategory: null },
        { canonicalCategory: "" },
        { canonicalCategory: { $exists: false } },
      ],
    },
    { projection: { title: 1, category: 1, description: 1 } },
  );

  let ops: mongo.AnyBulkWriteOperation[] = [];
  for await (const job of cursor) {
    const key = matchJobCategoryRuleBased({
      title: typeof job.title === "string" ? job.title : null,
      providerCategory: typeof job.category === "string" ? job.category : null,
    });
    if (key) {
      ops.push({
        updateOne: { filter: { _id: job._id }, update: { $set: { canonicalCategory: key } } },
      });
    }
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
  // Forward-only: the rule-based classification is derived data, not reversible
  // without losing AI-assigned categories that may have landed since.
}
