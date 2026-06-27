import type { mongo } from "mongoose";
import { createUniqueIndexSafely } from "../src/lib/persistence/migration-index-helpers";

const COLLECTION = "promo_code_redemption";
const INDEX_NAME = "promoCode_company_unique";

interface DuplicateGroup {
  ids: number[];
}

const dedupePerCompanyRedemptions = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection(COLLECTION);
  const duplicateGroups = (await collection
    .aggregate([
      {
        $group: {
          _id: { promoCodeId: "$promoCodeId", companyId: "$companyId" },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray()) as DuplicateGroup[];

  const idsToDelete = duplicateGroups.flatMap((group) =>
    [...group.ids].sort((a, b) => a - b).slice(1),
  );

  if (idsToDelete.length > 0) {
    await collection.deleteMany({
      _id: { $in: idsToDelete },
    } as unknown as mongo.Filter<mongo.Document>);
  }
};

export const up = async (db: mongo.Db): Promise<void> => {
  await dedupePerCompanyRedemptions(db);
  await createUniqueIndexSafely(
    db,
    COLLECTION,
    { promoCodeId: 1, companyId: 1 },
    { name: INDEX_NAME },
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(COLLECTION)
    .dropIndex(INDEX_NAME)
    .catch(() => undefined);
};
