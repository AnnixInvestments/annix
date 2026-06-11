import type { mongo } from "mongoose";

// Guarantees "Annix Ops" (code=ops) is hidden from the admin app/invite lists.
// The sibling 20260607130000 migration only deletes the app when it has zero
// user_app_access rows; the legacy ops seed granted access to stock-control +
// au-rubber users, so that deletion is skipped on populated environments and
// the app keeps showing. Deactivating it removes it from findAllActive()
// (the dropdown) without deleting data or breaking existing access / passkey.
// Idempotent.
const APP_CODE = "ops";

export const up = async (db: mongo.Db): Promise<void> => {
  await db.collection("apps").updateOne({ code: APP_CODE }, { $set: { isActive: false } });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection("apps").updateOne({ code: APP_CODE }, { $set: { isActive: true } });
};
