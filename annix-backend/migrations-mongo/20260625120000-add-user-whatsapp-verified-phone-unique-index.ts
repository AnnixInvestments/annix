import type { mongo } from "mongoose";

const COLLECTION = "user";
const INDEX_NAME = "whatsappVerifiedPhone_unique";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).createIndex(
    { whatsappVerifiedPhone: 1 },
    {
      name: INDEX_NAME,
      unique: true,
      partialFilterExpression: { whatsappVerifiedPhone: { $type: "string" } },
    },
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex(INDEX_NAME)
    .catch(() => undefined);
};
