import type { mongo } from "mongoose";

const TIMESTAMP_FIELDS = ["createdAt", "updatedAt"] as const;

const convertField = async (
  db: mongo.Db,
  collectionName: string,
  field: (typeof TIMESTAMP_FIELDS)[number],
): Promise<{ converted: number; skipped: number }> => {
  const collection = db.collection(collectionName);
  const stringDocs = await collection
    .find({ [field]: { $type: "string" } }, { projection: { [field]: 1 } })
    .toArray();

  const operations = stringDocs.reduce<mongo.AnyBulkWriteOperation[]>((ops, doc) => {
    const raw = doc[field] as unknown as string;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return ops;
    }
    return [
      ...ops,
      { updateOne: { filter: { _id: doc._id }, update: { $set: { [field]: parsed } } } },
    ];
  }, []);

  if (operations.length > 0) {
    await collection.bulkWrite(operations, { ordered: false });
  }

  return { converted: operations.length, skipped: stringDocs.length - operations.length };
};

export const up = async (db: mongo.Db): Promise<void> => {
  const collections = await db.listCollections({ type: "collection" }).toArray();

  await collections.reduce(async (prev, info) => {
    await prev;
    if (info.name.startsWith("system.")) {
      return;
    }
    await TIMESTAMP_FIELDS.reduce(async (fieldPrev, field) => {
      await fieldPrev;
      const { converted, skipped } = await convertField(db, info.name, field);
      if (converted > 0 || skipped > 0) {
        console.log(
          `[fix-string-timestamps] ${info.name}.${field}: converted ${converted}, skipped ${skipped}`,
        );
      }
    }, Promise.resolve());
  }, Promise.resolve());
};

export const down = async (): Promise<void> => {
  console.warn(
    "[fix-string-timestamps] irreversible — original string timestamp encodings are not retained; down is a no-op.",
  );
};
