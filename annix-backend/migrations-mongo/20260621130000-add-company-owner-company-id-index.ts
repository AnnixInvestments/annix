import type { mongo } from "mongoose";

const COLLECTION = "companies";
const INDEX_NAME = "companyType_1_ownerCompanyId_1_name_1";

export const up = async (db: mongo.Db): Promise<void> => {
  const exists = await db.listCollections({ name: COLLECTION }).hasNext();
  if (!exists) {
    return;
  }
  await db
    .collection(COLLECTION)
    .createIndex({ companyType: 1, ownerCompanyId: 1, name: 1 }, { name: INDEX_NAME });
};

export const down = async (db: mongo.Db): Promise<void> => {
  const exists = await db.listCollections({ name: COLLECTION }).hasNext();
  if (!exists) {
    return;
  }
  const indexes = await db.collection(COLLECTION).indexes();
  if (indexes.some((index) => index.name === INDEX_NAME)) {
    await db.collection(COLLECTION).dropIndex(INDEX_NAME);
  }
};
