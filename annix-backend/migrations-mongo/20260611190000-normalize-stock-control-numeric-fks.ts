import type { mongo } from "mongoose";

const NUMERIC_FK_FIELDS: Array<{ collection: string; field: string }> = [
  { collection: "supplier_invoices", field: "deliveryNoteId" },
  { collection: "supplier_invoice_items", field: "stockItemId" },
  { collection: "supplier_invoice_items", field: "linkedItemId" },
  { collection: "job_cards", field: "parentJobCardId" },
  { collection: "job_cards", field: "cpoId" },
  { collection: "job_cards", field: "supersededById" },
];

export const up = async (db: mongo.Db): Promise<void> => {
  await NUMERIC_FK_FIELDS.reduce(async (prev, { collection, field }) => {
    await prev;
    const result = await db.collection(collection).updateMany({ [field]: { $type: "string" } }, [
      {
        $set: {
          [field]: {
            $convert: { input: `$${field}`, to: "int", onError: `$${field}`, onNull: null },
          },
        },
      },
    ]);
    if (result.modifiedCount > 0) {
      console.log(`${collection}.${field}: converted ${result.modifiedCount} string value(s)`);
    }
  }, Promise.resolve());
};

export const down = async (): Promise<void> => {};
