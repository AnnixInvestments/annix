import type { mongo } from "mongoose";

const COLLECTIONS = ["cv_assistant_external_jobs", "cv_assistant_candidates"];
const BATCH = 500;

function encodeEmbedding(raw: string): Buffer | null {
  const trimmed = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (trimmed.length === 0) {
    return null;
  }
  const values = trimmed.split(",").map((part) => Number.parseFloat(part.trim()));
  if (values.length === 0 || values.some((value) => Number.isNaN(value))) {
    return null;
  }
  const floats = Float32Array.from(values);
  return Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength);
}

export const up = async (db: mongo.Db): Promise<void> => {
  for (const name of COLLECTIONS) {
    const col = db.collection(name);
    const cursor = col.find({ embedding: { $type: "string" } }, { projection: { embedding: 1 } });
    let ops: mongo.AnyBulkWriteOperation[] = [];
    for await (const doc of cursor) {
      const buffer = encodeEmbedding(doc.embedding as string);
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { embedding: buffer } },
        },
      });
      if (ops.length >= BATCH) {
        await col.bulkWrite(ops);
        ops = [];
      }
    }
    if (ops.length > 0) {
      await col.bulkWrite(ops);
    }
  }
};

export const down = async (): Promise<void> => {
  // Forward-only: binary embeddings are regenerable via the embeddings backfill.
};
