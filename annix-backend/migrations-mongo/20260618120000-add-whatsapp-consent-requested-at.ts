import type { mongo } from "mongoose";

const COLLECTION = "user";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .updateMany(
      { whatsappConsentRequestedAt: { $exists: false } },
      { $set: { whatsappConsentRequestedAt: null } },
    );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).updateMany({}, { $unset: { whatsappConsentRequestedAt: "" } });
};
