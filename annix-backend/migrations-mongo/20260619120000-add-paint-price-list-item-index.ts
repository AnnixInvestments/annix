import type { mongo } from "mongoose";

const COLLECTION = "paint_price_list_items";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).createIndex({ companyId: 1, supplierName: 1, productName: 1 });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).dropIndex("companyId_1_supplierName_1_productName_1");
};
