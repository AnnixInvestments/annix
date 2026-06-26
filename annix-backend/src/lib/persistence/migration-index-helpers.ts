import type { mongo } from "mongoose";

type IndexKeySpec = Record<string, 1 | -1>;

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

export async function findDuplicateKeys(
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

export async function createUniqueIndexSafely(
  db: mongo.Db,
  collectionName: string,
  key: IndexKeySpec,
  options: mongo.CreateIndexesOptions = {},
): Promise<void> {
  const collection = db.collection(collectionName);
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
        `createUniqueIndexSafely: ${collectionName} holds duplicate values for ${JSON.stringify(key)} — cannot build a unique index. Deduplicate in this migration first (see docs/migrations/rollback-runbook.md). Sample duplicates: ${sample}`,
      );
    }
  }
  await collection.createIndex(key as mongo.IndexSpecification, { ...options, unique: true });
}
