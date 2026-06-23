import type { mongo } from "mongoose";

// Phase 2 of per-app identity separation (#389). Backfills the canonical
// `appScope` on every legacy (null/unset) `user` record so each app's scoped
// login resolves it, splits records that a previous bug hijacked (an orbit
// scope stamped onto a record that also owns a customer profile), and adds a
// partial unique index on (emailLower, appScope). Forward-only, idempotent.
// Scope strings MUST match src/rbac/app-scope.ts.
const ADMIN = "annix:admin";
const SUPPLIER = "forge:supplier";
const CUSTOMER = "forge:customer";
const STOCK = "stock-control";

const lower = (email: unknown): string =>
  String(email ?? "")
    .trim()
    .toLowerCase();

export const up = async (db: mongo.Db): Promise<void> => {
  const users = db.collection("user");
  const all = await users.find({}).toArray();

  // 1. Backfill emailLower wherever missing (needed for the unique index).
  for (const u of all) {
    if (u.email && u.emailLower == null) {
      await users.updateOne({ _id: u._id }, { $set: { emailLower: lower(u.email) } });
    }
  }

  // Membership signals (all on the core cluster).
  const roleDocs = await db.collection("user_role").find({}).toArray();
  const roleName: Record<string, string> = {};
  for (const r of roleDocs) roleName[String(r._id)] = lower(r.name ?? r.code);
  const junction = await db.collection("user_roles_user_role").find({}).toArray();
  const rolesByUser: Record<string, string[]> = {};
  for (const x of junction) {
    const uid = String(x.userId);
    (rolesByUser[uid] = rolesByUser[uid] ?? []).push(roleName[String(x.userRoleId)] ?? "");
  }
  const custUserIds = new Set(
    (await db.collection("customer_profiles").find({}).project({ userId: 1 }).toArray()).map(
      (d) => d.userId,
    ),
  );
  const supplierRows = await db
    .collection("supplier_profiles")
    .find({})
    .project({ userId: 1 })
    .toArray()
    .catch(() => [] as Array<{ userId: unknown }>);
  const supUserIds = new Set(supplierRows.map((d) => d.userId));
  const stockEmails = new Set(
    (await db.collection("stock_control_users").find({}).project({ email: 1 }).toArray()).map((d) =>
      lower(d.email),
    ),
  );

  const hasRole = (id: unknown, role: string): boolean =>
    (rolesByUser[String(id)] ?? []).includes(role);

  // 2. Derive + set appScope for legacy (null/unset) records.
  // Priority: admin > supplier > customer > stock-control. No signal -> left null
  // (inert: such a record has no profile/role and authenticates nowhere).
  for (const u of all) {
    if (u.appScope) continue;
    const el = lower(u.email);
    let scope: string | null = null;
    if (hasRole(u._id, "admin") || hasRole(u._id, "superadmin")) scope = ADMIN;
    else if (hasRole(u._id, "supplier") || supUserIds.has(u._id)) scope = SUPPLIER;
    else if (hasRole(u._id, "customer") || custUserIds.has(u._id)) scope = CUSTOMER;
    else if (stockEmails.has(el)) scope = STOCK;
    if (scope) {
      await users.updateOne({ _id: u._id }, { $set: { appScope: scope, updatedAt: new Date() } });
    }
  }

  // 3. Split hijacked records: an orbit-scoped record that also owns a customer
  // profile -> keep it as the orbit identity, move the customer profile to a new
  // forge:customer record. Idempotent (skip when a non-orbit record already
  // exists for the email).
  const hijacked = await users.find({ appScope: { $regex: /^orbit:/ } }).toArray();
  for (const u of hijacked) {
    if (!custUserIds.has(u._id)) continue;
    const el = lower(u.email);
    const existing = await users.findOne({
      emailLower: el,
      appScope: { $not: { $regex: /^orbit:/ } },
    });
    if (existing) continue;
    const maxDoc = await users.find({}).sort({ _id: -1 }).limit(1).toArray();
    const newId = Number(maxDoc[0]._id) + 1;
    const fresh = { ...u, _id: newId, emailLower: el, appScope: CUSTOMER, updatedAt: new Date() };
    await users.insertOne(fresh as unknown as Parameters<typeof users.insertOne>[0]);
    await db
      .collection("customer_profiles")
      .updateOne({ userId: u._id }, { $set: { userId: newId } });
  }

  // 4. Enforce one record per (email, app) for scoped records. Partial so the
  // few remaining un-scoped legacy records don't collide.
  await users.createIndex(
    { emailLower: 1, appScope: 1 },
    {
      name: "emailLower_appScope_unique",
      unique: true,
      partialFilterExpression: { appScope: { $exists: true, $type: "string" } },
    },
  );
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection("user")
    .dropIndex("emailLower_appScope_unique")
    .catch(() => undefined);
  // The appScope/emailLower backfill and the identity split are forward-only.
};
