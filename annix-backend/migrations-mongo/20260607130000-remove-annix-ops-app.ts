import type { mongo } from "mongoose";

// "Annix Ops" (code=ops) was a never-adopted "unified operations platform"
// placeholder with zero user assignments. Remove the app + its roles + any
// access rows so it stops appearing in the admin app/invite lists. Idempotent.
const APP_CODE = "ops";

export const up = async (db: mongo.Db): Promise<void> => {
  const app = await db.collection("apps").findOne({ code: APP_CODE });
  if (!app) {
    return;
  }
  const appId = app._id;
  const access = await db.collection("user_app_access").countDocuments({ appId });
  if (access > 0) {
    console.warn(
      `[migration] Skipping removal of "${APP_CODE}" — ${access} user_app_access row(s) exist; remove them first.`,
    );
    return;
  }
  await db.collection("app_roles").deleteMany({ appId });
  await db.collection("apps").deleteOne({ _id: appId });
};

export const down = async (): Promise<void> => {
  // No-op: the placeholder app is not restored.
};
