import type { mongo } from "mongoose";

// Indexes for the RFQ sourcing in-app quote surface (issue #432, Phase 0).
// autoIndex is off in this app, so indexes are created here. createIndex is
// idempotent (same name + spec is a no-op) and creates the collection if absent.
//
// boqs: a PARTIAL-unique index on { sourceSessionId, sourceBucketRef } is the
// storage backstop for "one BOQ per sourcing bucket". The partial filter limits
// the index to documents that actually carry a sourceSessionId, so the millions
// of existing BOQs created through the drawing/RFQ flow (no sourceSessionId) are
// excluded and cannot collide on a null key.
//
// boq_supplier_access: two NON-unique lookup indexes — one to trace a supplier
// access record back to its sourcing bucket, one for the supplier's own
// pending/quoted list.
const BOQS_COLLECTION = "boqs";
const ACCESS_COLLECTION = "boq_supplier_access";

const BOQ_SOURCING_INDEX = "sourceSessionId_1_sourceBucketRef_1";
const ACCESS_SOURCING_INDEX = "sourceSessionId_1_bucketRef_1";
const ACCESS_SUPPLIER_STATUS_INDEX = "supplierProfileId_1_status_1";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(BOQS_COLLECTION).createIndex(
    { sourceSessionId: 1, sourceBucketRef: 1 },
    {
      name: BOQ_SOURCING_INDEX,
      unique: true,
      partialFilterExpression: { sourceSessionId: { $exists: true } },
    },
  );
  await db
    .collection(ACCESS_COLLECTION)
    .createIndex({ sourceSessionId: 1, bucketRef: 1 }, { name: ACCESS_SOURCING_INDEX });
  await db
    .collection(ACCESS_COLLECTION)
    .createIndex({ supplierProfileId: 1, status: 1 }, { name: ACCESS_SUPPLIER_STATUS_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(BOQS_COLLECTION)
    .dropIndex(BOQ_SOURCING_INDEX)
    .catch(() => undefined);
  await db
    .collection(ACCESS_COLLECTION)
    .dropIndex(ACCESS_SOURCING_INDEX)
    .catch(() => undefined);
  await db
    .collection(ACCESS_COLLECTION)
    .dropIndex(ACCESS_SUPPLIER_STATUS_INDEX)
    .catch(() => undefined);
};
