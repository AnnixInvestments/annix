import type { mongo } from "mongoose";

type NumericDoc = { _id: number; [key: string]: unknown };

// Issue #311 step 4.1 — seed the `teacher-assistant` app + standard
// roles into universal RBAC so Teacher Assistant accounts can be
// anchored and granted like every other portal. Self-contained
// (no src/ imports) and idempotent.

const APP_CODE = "teacher-assistant";

const STANDARD_ROLES = [
  { code: "viewer", name: "Viewer", description: "Read-only access", order: 1 },
  { code: "editor", name: "Editor", description: "Can view and edit content", order: 2 },
  { code: "manager", name: "Manager", description: "Full access except settings", order: 3 },
  {
    code: "administrator",
    name: "Administrator",
    description: "Full access including settings",
    order: 4,
  },
];

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
  const apps = db.collection<NumericDoc>("apps");
  const appRoles = db.collection<NumericDoc>("app_roles");
  const nowDate = new Date();

  const existingApp = await apps.findOne({ code: APP_CODE });
  let appId: number;
  if (existingApp) {
    appId = Number(existingApp._id);
    console.log(`apps: '${APP_CODE}' already present (id=${appId})`);
  } else {
    appId = await allocateId(db, "apps");
    const maxOrder = await apps
      .find({}, { projection: { displayOrder: 1 } })
      .sort({ displayOrder: -1 })
      .limit(1)
      .toArray();
    const displayOrder = (maxOrder.length > 0 ? Number(maxOrder[0].displayOrder) : 0) + 1;
    await apps.insertOne({
      _id: appId,
      code: APP_CODE,
      name: "Teacher Assistant",
      description: "Lesson planning and assignment generation for teachers",
      icon: "graduation-cap",
      isActive: true,
      displayOrder,
      createdAt: nowDate,
      updatedAt: nowDate,
    });
    console.log(`apps: inserted '${APP_CODE}' (id=${appId})`);
  }

  await STANDARD_ROLES.reduce(async (prev, role) => {
    await prev;
    const existingRole = await appRoles.findOne({ appId, code: role.code });
    if (existingRole) {
      return;
    }
    const roleId = await allocateId(db, "app_roles");
    await appRoles.insertOne({
      _id: roleId,
      appId,
      code: role.code,
      name: role.name,
      description: role.description,
      isDefault: role.code === "viewer",
      displayOrder: role.order,
      createdAt: nowDate,
      updatedAt: nowDate,
    });
    console.log(`app_roles: inserted '${role.code}' for '${APP_CODE}' (id=${roleId})`);
  }, Promise.resolve());
};

export const down = async (db: mongo.Db): Promise<void> => {
  const apps = db.collection("apps");
  const app = await apps.findOne({ code: APP_CODE });
  if (!app) {
    return;
  }
  await db.collection("app_roles").deleteMany({ appId: Number(app._id) });
  await apps.deleteOne({ _id: app._id });
};
