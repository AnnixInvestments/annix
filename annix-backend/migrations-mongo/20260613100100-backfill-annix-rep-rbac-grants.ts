import type { mongo } from "mongoose";

type NumericDoc = { _id: number; [key: string]: unknown };

// Issue #311 step 4.1 — backfill a universal-RBAC grant for every
// existing Annix Pulse (annix-rep) rep profile whose core user has no
// `annix-rep` access row yet. Additive + inert: Annix Pulse login
// still gates on the legacy `annixRep` User role; this grant is
// consulted by nothing until step 4.3's staging-validated rollout.
// The role is a least-privilege anchor (viewer) — a mis-fire under-
// grants (safe re-prompt) rather than escalating; real per-user roles
// are assigned during the step 4.3 privilege-matrix step.
// Self-contained (no src/ imports) and idempotent.

const APP_CODE = "annix-rep";
const ANCHOR_ROLE = "viewer";

async function allocateId(db: mongo.Db, collection: string): Promise<number> {
  const counters = db.collection<{ _id: string; seq: number }>("counters");
  const counterDoc = await counters.findOne({ _id: collection });
  let current: number;
  if (counterDoc && typeof counterDoc.seq === "number") {
    current = counterDoc.seq;
  } else {
    const top = await db
      .collection(collection)
      .find({}, { projection: { _id: 1 } })
      .sort({ _id: -1 })
      .limit(1)
      .toArray();
    current = top.length > 0 ? Number(top[0]._id) : 0;
  }
  const next = current + 1;
  await counters.updateOne({ _id: collection }, { $set: { seq: next } }, { upsert: true });
  return next;
}

export const up = async (db: mongo.Db): Promise<void> => {
  const app = await db.collection("apps").findOne({ code: APP_CODE });
  if (!app) {
    console.log(`apps: '${APP_CODE}' not found — skipping rep grant backfill`);
    return;
  }
  const appId = Number(app._id);

  const role = await db.collection("app_roles").findOne({ appId, code: ANCHOR_ROLE });
  const roleId = role ? Number(role._id) : null;

  const access = db.collection<NumericDoc>("user_app_access");
  const grantedUserIds = new Set<number>(
    (await access.find({ appId }, { projection: { userId: 1 } }).toArray()).map((row) =>
      Number(row.userId),
    ),
  );

  const repProfiles = await db
    .collection("annix_rep_rep_profiles")
    .find({}, { projection: { userId: 1 } })
    .toArray();

  const missingUserIds = [
    ...new Set(
      repProfiles
        .map((profile) => Number(profile.userId))
        .filter((userId) => Number.isFinite(userId) && !grantedUserIds.has(userId)),
    ),
  ];

  const nowDate = new Date();
  await missingUserIds.reduce(async (prev, userId) => {
    await prev;
    const grantId = await allocateId(db, "user_app_access");
    await access.insertOne({
      _id: grantId,
      userId,
      appId,
      roleId,
      useCustomPermissions: false,
      grantedById: null,
      expiresAt: null,
      grantedAt: nowDate,
      updatedAt: nowDate,
    });
  }, Promise.resolve());

  console.log(
    `user_app_access: backfilled ${missingUserIds.length} '${APP_CODE}' grant(s) (${grantedUserIds.size} already present)`,
  );
};

export const down = async (): Promise<void> => {};
