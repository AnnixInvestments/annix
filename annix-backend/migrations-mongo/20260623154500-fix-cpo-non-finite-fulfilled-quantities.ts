import type { mongo } from "mongoose";

const ITEMS = "customer_purchase_order_items";
const CPOS = "customer_purchase_orders";

interface CpoItemDoc {
  _id: number;
  cpoId?: number;
  quantityFulfilled?: unknown;
}

interface CpoDoc {
  _id: number;
  fulfilledQuantity?: unknown;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const up = async (db: mongo.Db): Promise<void> => {
  const affectedCpoIds = new Set<number>();

  const itemsExist = await db.listCollections({ name: ITEMS }).hasNext();
  if (itemsExist) {
    const items = db.collection<CpoItemDoc>(ITEMS);
    const allItems = await items
      .find({}, { projection: { _id: 1, cpoId: 1, quantityFulfilled: 1 } })
      .toArray();
    const brokenItems = allItems.filter((doc) => !isFiniteNumber(doc.quantityFulfilled));
    brokenItems.forEach((doc) => {
      if (typeof doc.cpoId === "number") {
        affectedCpoIds.add(doc.cpoId);
      }
    });
    if (brokenItems.length > 0) {
      await items.bulkWrite(
        brokenItems.map((doc) => ({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { quantityFulfilled: 0 } },
          },
        })),
      );
    }
  }

  const cposExist = await db.listCollections({ name: CPOS }).hasNext();
  if (!cposExist) {
    return;
  }
  const cpos = db.collection<CpoDoc>(CPOS);

  const allCpos = await cpos.find({}, { projection: { _id: 1, fulfilledQuantity: 1 } }).toArray();
  allCpos.forEach((cpo) => {
    if (!isFiniteNumber(cpo.fulfilledQuantity)) {
      affectedCpoIds.add(cpo._id);
    }
  });

  const cpoIds = [...affectedCpoIds];
  if (cpoIds.length === 0) {
    return;
  }

  const sums = itemsExist
    ? await db
        .collection<CpoItemDoc>(ITEMS)
        .aggregate<{ _id: number; total: number }>([
          { $match: { cpoId: { $in: cpoIds } } },
          { $group: { _id: "$cpoId", total: { $sum: "$quantityFulfilled" } } },
        ])
        .toArray()
    : [];
  const totalByCpoId = new Map(sums.map((row) => [row._id, row.total]));

  await cpos.bulkWrite(
    cpoIds.map((cpoId) => {
      const total = totalByCpoId.get(cpoId);
      return {
        updateOne: {
          filter: { _id: cpoId },
          update: { $set: { fulfilledQuantity: isFiniteNumber(total) ? total : 0 } },
        },
      };
    }),
  );
};

export const down = async (): Promise<void> => {
  // Forward-only data repair: corrupted NaN / missing fulfilled quantities
  // cannot be meaningfully restored, so there is nothing to revert.
};
