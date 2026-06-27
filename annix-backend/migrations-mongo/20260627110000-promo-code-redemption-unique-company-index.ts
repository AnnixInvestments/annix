import type { mongo } from "mongoose";

// The index helper is inlined (snapshotted) here rather than imported from
// `../src/lib/persistence/migration-index-helpers` — the deploy image ships
// compiled `dist/`, not `src/`, so a migration that imports app source fails to
// load at release_command time with MODULE_NOT_FOUND and aborts the deploy.
// Migrations must be self-contained.
const COLLECTION = "promo_code_redemption";
const INDEX_NAME = "promoCode_company_unique";

type IndexKeySpec = Record<string, 1 | -1>;

interface DuplicateGroup {
  ids: number[];
}

function indexKeyMatches(target: IndexKeySpec, existing: Record<string, number>): boolean {
  const targetEntries = Object.entries(target);
  const existingEntries = Object.entries(existing);
  if (targetEntries.length !== existingEntries.length) {
    return false;
  }
  return targetEntries.every(([field, direction], position) => {
    const existingEntry = existingEntries[position];
    return existingEntry != null && existingEntry[0] === field && existingEntry[1] === direction;
  });
}

async function findDuplicateKeys(
  db: mongo.Db,
  collectionName: string,
  key: IndexKeySpec,
  sampleLimit = 10,
): Promise<Array<{ key: Record<string, unknown>; count: number }>> {
  const groupId = Object.keys(key).reduce<Record<string, string>>((acc, field) => {
    acc[field] = `$${field}`;
    return acc;
  }, {});
  const groups = await db
    .collection(collectionName)
    .aggregate([
      { $group: { _id: groupId, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: sampleLimit },
    ])
    .toArray();
  return groups.map((group) => ({
    key: group._id as Record<string, unknown>,
    count: group.count as number,
  }));
}

async function createUniqueIndexSafely(
  db: mongo.Db,
  collectionName: string,
  key: IndexKeySpec,
  options: mongo.CreateIndexesOptions = {},
): Promise<void> {
  const collection = db.collection(collectionName);
  const collectionExists =
    (await db.listCollections({ name: collectionName }).toArray()).length > 0;
  if (!collectionExists) {
    // The collection has never been written to (autoCreate is off), so there is
    // nothing to deduplicate and no existing index to reconcile — and calling
    // collection.indexes() would throw "ns does not exist". Create the
    // collection-with-index directly so the unique constraint is in place before
    // the first write (autoIndex is off, so it must be built explicitly here).
    await collection.createIndex(key as mongo.IndexSpecification, { ...options, unique: true });
    return;
  }
  const existingIndexes = await collection.indexes();
  const sameKeyIndex = existingIndexes.find((index) =>
    indexKeyMatches(key, index.key as Record<string, number>),
  );
  if (sameKeyIndex != null) {
    if (sameKeyIndex.unique === true) {
      return;
    }
    throw new Error(
      `createUniqueIndexSafely: ${collectionName} already has a non-unique index "${sameKeyIndex.name}" on ${JSON.stringify(key)}. Drop it in this migration before creating the unique index.`,
    );
  }
  const enforcesEveryDocument = options.sparse !== true && options.partialFilterExpression == null;
  if (enforcesEveryDocument) {
    const duplicates = await findDuplicateKeys(db, collectionName, key);
    if (duplicates.length > 0) {
      const sample = duplicates
        .map((duplicate) => `${JSON.stringify(duplicate.key)} x${duplicate.count}`)
        .join(", ");
      throw new Error(
        `createUniqueIndexSafely: ${collectionName} holds duplicate values for ${JSON.stringify(key)} — cannot build a unique index. Deduplicate in this migration first. Sample duplicates: ${sample}`,
      );
    }
  }
  await collection.createIndex(key as mongo.IndexSpecification, { ...options, unique: true });
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
