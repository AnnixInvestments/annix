import type { mongo } from "mongoose";

const COLLECTION = "rubber_bonding_agents";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).createIndex({ companyId: 1, supplier: 1, name: 1 });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).dropIndex("companyId_1_supplier_1_name_1");
};
