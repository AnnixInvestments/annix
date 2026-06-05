import type { mongo } from "mongoose";

const COLLECTION = "rfq_drafts";

// The rfq_drafts schema previously declared createdAt / updatedAt as
// String on a timestamps:true model, so Mongoose cast the managed
// timestamps to BSON String. String-typed dates sort below real Dates
// (mis-ordering the draft list) and break $gte / $lte range filters
// (the date-range draft query silently dropped rows). The schema is now
// Date; convert any string-stored timestamps already in the collection.
export const up = async (db: mongo.Db): Promise<void> => {
  const cursor = db
    .collection(COLLECTION)
    .find({ $or: [{ createdAt: { $type: "string" } }, { updatedAt: { $type: "string" } }] });
  for await (const doc of cursor) {
    const set: Record<string, Date> = {};
    const rawCreatedAt = doc.createdAt;
    const rawUpdatedAt = doc.updatedAt;
    if (typeof rawCreatedAt === "string") {
      const parsed = new Date(rawCreatedAt);
      if (!Number.isNaN(parsed.getTime())) set.createdAt = parsed;
    }
    if (typeof rawUpdatedAt === "string") {
      const parsed = new Date(rawUpdatedAt);
      if (!Number.isNaN(parsed.getTime())) set.updatedAt = parsed;
    }
    if (Object.keys(set).length > 0) {
      await db.collection(COLLECTION).updateOne({ _id: doc._id }, { $set: set });
    }
  }
};

// No-op: reverting Date → String would re-introduce the corruption the
// up migration exists to remove.
export const down = async (): Promise<void> => {};
