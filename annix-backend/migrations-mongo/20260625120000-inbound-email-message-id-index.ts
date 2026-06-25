import type { mongo } from "mongoose";

// Index for inbound-email dedup. The poller now scans a recent date window
// (rather than only UNSEEN mail) and dedups every scanned message by its
// Message-ID via InboundEmailRepository.existsByMessageId — a per-poll lookup
// that was previously an unindexed countDocuments scan. autoIndex is off in
// this app, so the index is created here. Non-unique on purpose: dedup is
// enforced in code, and a synthetic id collision for headerless mail must not
// hard-fail a recordEmail insert. createIndex creates the collection if absent.
const COLLECTION = "inbound_emails";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).createIndex({ messageId: 1 }, { name: "messageId_1" });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex("messageId_1")
    .catch(() => undefined);
};
