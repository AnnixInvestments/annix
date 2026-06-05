import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_external_jobs";

interface ExternalJobRow {
  _id: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const toDate = (value: unknown): Date | null => {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const up = async (db: mongo.Db): Promise<void> => {
  const col = db.collection<ExternalJobRow>(COLLECTION);
  const rows = await col
    .find({ $or: [{ createdAt: { $type: "string" } }, { updatedAt: { $type: "string" } }] })
    .project({ createdAt: 1, updatedAt: 1 })
    .toArray();
  if (rows.length === 0) {
    return;
  }

  const ops = rows.flatMap((row) => {
    const set: Record<string, Date> = {};
    const createdAt = toDate(row.createdAt);
    if (createdAt) {
      set.createdAt = createdAt;
    }
    const updatedAt = toDate(row.updatedAt);
    if (updatedAt) {
      set.updatedAt = updatedAt;
    }
    if (Object.keys(set).length === 0) {
      return [];
    }
    return [{ updateOne: { filter: { _id: row._id }, update: { $set: set } } }];
  });

  if (ops.length > 0) {
    await col.bulkWrite(ops);
  }
};

export const down = async (): Promise<void> => {};
