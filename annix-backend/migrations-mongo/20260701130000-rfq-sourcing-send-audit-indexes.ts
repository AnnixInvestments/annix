import type { mongo } from "mongoose";

// Indexes for the RFQ supplier-sourcing send audit (issue #432). autoIndex is
// off in this app, so indexes are created here. All three are NON-unique: the
// audit is insert-only and dedup is not enforced at the storage layer.
// createIndex creates the collection if absent.
const COLLECTION = "rfq_sourcing_send_audits";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .createIndex({ companyId: 1, createdAt: -1 }, { name: "companyId_1_createdAt_-1" });
  await db.collection(COLLECTION).createIndex({ sessionId: 1 }, { name: "sessionId_1" });
  await db.collection(COLLECTION).createIndex({ messageId: 1 }, { name: "messageId_1" });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex("companyId_1_createdAt_-1")
    .catch(() => undefined);
  await db
    .collection(COLLECTION)
    .dropIndex("sessionId_1")
    .catch(() => undefined);
  await db
    .collection(COLLECTION)
    .dropIndex("messageId_1")
    .catch(() => undefined);
};
