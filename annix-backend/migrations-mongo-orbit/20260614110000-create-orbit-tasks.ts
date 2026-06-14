import type { mongo } from "mongoose";

// Issue #362 phase 6 — recruiter task list collection + index on the
// Orbit cluster (autoIndex is off). Idempotent.

const COLLECTION = "orbit_tasks";

export const up = async (db: mongo.Db): Promise<void> => {
  const existing = await db.listCollections({ name: COLLECTION }).toArray();
  if (existing.length === 0) {
    await db.createCollection(COLLECTION);
  }
  await db
    .collection(COLLECTION)
    .createIndex({ companyId: 1, done: 1, dueDate: 1 }, { name: "idx_orbit_tasks_company_due" });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .drop()
    .catch(() => undefined);
};
