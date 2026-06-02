import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_external_jobs";
const INDEX_NAME = "source_external_id_source_id_unique";

export const up = async (db: mongo.Db): Promise<void> => {
  const collection = db.collection<{ _id: number }>(COLLECTION);

  const duplicateGroups = await collection
    .aggregate<{ _id: { sourceExternalId: unknown; sourceId: unknown }; ids: number[] }>([
      {
        $match: {
          sourceExternalId: { $exists: true, $ne: null },
          sourceId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: { sourceExternalId: "$sourceExternalId", sourceId: "$sourceId" },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  const idsToDelete = duplicateGroups.flatMap((group) =>
    [...group.ids].sort((a, b) => a - b).slice(1),
  );

  if (idsToDelete.length > 0) {
    await collection.deleteMany({ _id: { $in: idsToDelete } });
  }

  await collection.createIndex(
    { sourceExternalId: 1, sourceId: 1 },
    { unique: true, name: INDEX_NAME },
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).dropIndex(INDEX_NAME);
};
