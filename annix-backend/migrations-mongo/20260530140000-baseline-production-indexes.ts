import type { mongo } from "mongoose";

const collectionName = "cv_assistant_source_respect_ranks";
const indexName = "provider_1";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(collectionName)
    .createIndex({ provider: 1 }, { unique: true, name: indexName });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(collectionName).dropIndex(indexName);
};
