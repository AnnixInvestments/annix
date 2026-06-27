import type { mongo } from "mongoose";

interface CoveringIndex {
  collection: string;
  key: Record<string, 1 | -1>;
  name: string;
}

const COVERING_INDEXES: CoveringIndex[] = [
  {
    collection: "customer_purchase_orders",
    key: { companyId: 1, createdAt: -1 },
    name: "cpo_company_created_idx",
  },
  {
    collection: "delivery_notes",
    key: { companyId: 1, createdAt: -1 },
    name: "delivery_note_company_created_idx",
  },
  {
    collection: "sm_issuance_session",
    key: { companyId: 1, createdAt: -1 },
    name: "issuance_session_company_created_idx",
  },
  {
    collection: "sm_issuable_product",
    key: { companyId: 1, name: 1 },
    name: "issuable_product_company_name_idx",
  },
  {
    collection: "rfqs",
    key: { createdAt: -1 },
    name: "rfq_created_idx",
  },
  {
    collection: "rubber_delivery_notes",
    key: { createdAt: -1, _id: -1 },
    name: "rubber_delivery_note_created_id_idx",
  },
  {
    collection: "rubber_tax_invoices",
    key: { createdAt: -1, _id: -1 },
    name: "rubber_tax_invoice_created_id_idx",
  },
];

const existingCollectionNames = async (db: mongo.Db): Promise<Set<string>> => {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  return new Set(collections.map((collection) => collection.name));
};

export const up = async (db: mongo.Db): Promise<void> => {
  const present = await existingCollectionNames(db);
  await Promise.all(
    COVERING_INDEXES.filter((index) => present.has(index.collection)).map((index) =>
      db
        .collection(index.collection)
        .createIndex(index.key as mongo.IndexSpecification, { name: index.name }),
    ),
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await Promise.all(
    COVERING_INDEXES.map((index) =>
      db
        .collection(index.collection)
        .dropIndex(index.name)
        .catch(() => undefined),
    ),
  );
};
