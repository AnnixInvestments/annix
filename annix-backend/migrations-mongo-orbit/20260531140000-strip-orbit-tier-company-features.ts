import type { mongo } from "mongoose";

const COLLECTION = "cv_assistant_tier_capabilities";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).updateMany(
    {},
    {
      $unset: {
        "features.references": "",
        "features.futurePath": "",
      },
    },
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).updateMany(
    {},
    {
      $set: {
        "features.references": false,
        "features.futurePath": false,
      },
    },
  );
};
