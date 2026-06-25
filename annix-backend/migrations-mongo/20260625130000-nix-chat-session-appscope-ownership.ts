import type { mongo } from "mongoose";

const COLLECTION = "nix_chat_sessions";
const OWNERSHIP_INDEX = "userId_1_appScope_1_isActive_1";

export const up = async (db: mongo.Db): Promise<void> => {
  const sessions = db.collection(COLLECTION);

  await sessions.updateMany(
    { isActive: true, appScope: { $in: [null, ""] } },
    { $set: { isActive: false } },
  );

  await sessions.createIndex({ userId: 1, appScope: 1, isActive: 1 }, { name: OWNERSHIP_INDEX });
};

export const down = async (db: mongo.Db): Promise<void> => {
  const sessions = db.collection(COLLECTION);
  const indexes = await sessions.indexes();
  if (indexes.some((i) => i.name === OWNERSHIP_INDEX)) {
    await sessions.dropIndex(OWNERSHIP_INDEX);
  }
};
