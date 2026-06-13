import type { mongo } from "mongoose";

const COLLECTION = "website_page";

export const up = async (db: mongo.Db): Promise<void> => {
  const pages = await db
    .collection(COLLECTION)
    .find({ publishedBlocks: { $exists: false } })
    .toArray();

  const now = new Date().toISOString();

  for (const page of pages) {
    const markdown = typeof page.content === "string" ? page.content : "";
    const blocks = [{ type: "richText", markdown }];
    await db.collection(COLLECTION).updateOne(
      { _id: page._id },
      {
        $set: {
          publishedBlocks: blocks,
          draftBlocks: blocks,
          useBlocks: false,
          lastPublishedAt: now,
          draftUpdatedAt: now,
        },
      },
    );
  }

  console.warn(`[migration] Backfilled blocks for ${pages.length} website_page document(s).`);
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).updateMany(
    {},
    {
      $unset: {
        publishedBlocks: "",
        draftBlocks: "",
        lastPublishedAt: "",
        lastPublishedBy: "",
        draftUpdatedAt: "",
      },
    },
  );
};
