import type { mongo } from "mongoose";

// The AI spend dashboard showed an "unknown" bucket for calls logged without an
// app context (the old AiApp.UNKNOWN default). Those historical rows carry no
// discriminator (both app and actionType defaulted to unknown/uncontextualised),
// so they cannot be split back to their originating app. Re-bucket them into the
// named "platform" catch-all so the chart never shows "unknown". Going forward,
// each app passes its own usageLog context, so this is a one-time cleanup of
// legacy rows only. ai_usage_logs lives on the core cluster.
const COLLECTION = "ai_usage_logs";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection(COLLECTION).updateMany({ app: "unknown" }, { $set: { app: "platform" } });
};

export const down = async (_db: mongo.Db): Promise<void> => {
  // Forward-only: after cutover, "platform" also holds new legitimately-platform
  // rows, so we cannot safely re-split them back to "unknown".
};
