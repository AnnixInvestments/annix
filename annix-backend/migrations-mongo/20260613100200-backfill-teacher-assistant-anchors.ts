import type { mongo } from "mongoose";

type NumericDoc = { _id: number; [key: string]: unknown };

// Issue #311 step 4.1 — anchor every existing standalone Teacher
// Assistant account to a `teacher-assistant`-scoped core User and a
// universal-RBAC grant. Additive + inert: TA login still authenticates
// against teacher_assistant_users.passwordHash; the core User carries
// no password and is purely an identity/RBAC anchor. The scope keeps
// the anchor from ever merging with a customer/orbit account on the
// same email. Self-contained (no src/ imports) and idempotent.

const APP_CODE = "teacher-assistant";
const APP_SCOPE = "teacher-assistant";
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

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") {
    return null;
  }
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function splitName(rawName: unknown): { firstName: string; lastName: string | null } {
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const parts = name.split(/\s+/).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return { firstName: "Teacher", lastName: null };
  }
  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

export const up = async (db: mongo.Db): Promise<void> => {
  const app = await db.collection("apps").findOne({ code: APP_CODE });
  if (!app) {
    console.log(`apps: '${APP_CODE}' not found — run the app-seed migration first; skipping`);
    return;
  }
  const appId = Number(app._id);
  const role = await db.collection("app_roles").findOne({ appId, code: ANCHOR_ROLE });
  const roleId = role ? Number(role._id) : null;

  const users = db.collection<NumericDoc>("user");
  const access = db.collection<NumericDoc>("user_app_access");
  const teacherUsers = db.collection("teacher_assistant_users");

  const pending = await teacherUsers
    .find({ $or: [{ userId: { $exists: false } }, { userId: null }] })
    .toArray();

  const nowDate = new Date();
  let anchored = 0;

  await pending.reduce(async (prev, teacher) => {
    await prev;
    const email = normalizeEmail(teacher.email);
    if (!email) {
      return;
    }

    const existingAnchor = await users.findOne({ email, appScope: APP_SCOPE });
    let coreUserId: number;
    if (existingAnchor) {
      coreUserId = Number(existingAnchor._id);
    } else {
      coreUserId = await allocateId(db, "user");
      const { firstName, lastName } = splitName(teacher.name);
      await users.insertOne({
        _id: coreUserId,
        email,
        firstName,
        lastName,
        appScope: APP_SCOPE,
        emailVerified: false,
        status: "active",
        createdAt: nowDate,
        updatedAt: nowDate,
      });
    }

    await teacherUsers.updateOne({ _id: teacher._id }, { $set: { userId: coreUserId } });

    const existingGrant = await access.findOne({ userId: coreUserId, appId });
    if (!existingGrant) {
      const grantId = await allocateId(db, "user_app_access");
      await access.insertOne({
        _id: grantId,
        userId: coreUserId,
        appId,
        roleId,
        useCustomPermissions: false,
        grantedById: null,
        expiresAt: null,
        grantedAt: nowDate,
        updatedAt: nowDate,
      });
    }
    anchored += 1;
  }, Promise.resolve());

  console.log(`teacher_assistant_users: anchored ${anchored} account(s) to core User + RBAC grant`);
};

export const down = async (): Promise<void> => {};
