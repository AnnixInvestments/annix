import type { mongo } from "mongoose";

const COLLECTION = "rubber_price_list_items";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .createIndex({ companyId: 1, supplier: 1, productCode: 1, cureType: 1 });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).dropIndex("companyId_1_supplier_1_productCode_1_cureType_1");
};
