import type { mongo } from "mongoose";

const JOBS = "cv_assistant_external_jobs";
const EMBEDDINGS = "cv_assistant_external_job_embeddings";
const BATCH = 500;

export const up = async (db: mongo.Db): Promise<void> => {
  const existing = await db.listCollections({ name: EMBEDDINGS }).toArray();
  if (existing.length === 0) {
    await db.createCollection(EMBEDDINGS);
  }

  const jobs = db.collection(JOBS);
  const embeddings = db.collection(EMBEDDINGS);
  const cursor = jobs.find(
    { embedding: { $exists: true, $ne: null } },
    { projection: { embedding: 1 } },
  );

  let copyOps: mongo.AnyBulkWriteOperation[] = [];
  let unsetOps: mongo.AnyBulkWriteOperation[] = [];

  const flush = async (): Promise<void> => {
    if (copyOps.length === 0) return;
    await embeddings.bulkWrite(copyOps);
    await jobs.bulkWrite(unsetOps);
    copyOps = [];
    unsetOps = [];
  };

  for await (const doc of cursor) {
    copyOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { embedding: doc.embedding, updatedAt: new Date() } },
        upsert: true,
      },
    });
    unsetOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $unset: { embedding: "" } },
      },
    });
    if (copyOps.length >= BATCH) {
      await flush();
    }
  }
  await flush();
};

export const down = async (db: mongo.Db): Promise<void> => {
  const jobs = db.collection(JOBS);
  const embeddings = db.collection(EMBEDDINGS);
  const cursor = embeddings.find({}, { projection: { embedding: 1 } });

  let ops: mongo.AnyBulkWriteOperation[] = [];
  for await (const doc of cursor) {
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { embedding: doc.embedding } },
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

  await embeddings.drop().catch(() => undefined);
};
