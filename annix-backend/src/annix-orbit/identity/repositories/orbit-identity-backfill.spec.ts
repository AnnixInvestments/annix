import { isNumber, isObject, toPairs } from "es-toolkit/compat";
import type { mongo } from "mongoose";
import {
  runOrbitIdentityMigration,
  verifyOrbitIdentityMigration,
} from "../../../../scripts/migrate-orbit-identities";

// No live Mongo / mongodb-memory-server in this repo (Orbit specs are pure-unit
// with hand-rolled stores, see orbit-storage-migrations.spec.ts). We drive the
// REAL S2 backfill + verification functions against a faithful fake of the exact
// native-driver subset they use: find (+ $type/$regex), sort/limit, findOne,
// countDocuments, and updateOne with $set/$setOnInsert/upsert keyed on `_id`.

type Doc = Record<string, unknown>;

function matchesFilter(doc: Doc, filter: Doc): boolean {
  return toPairs(filter).every(([key, cond]) => {
    const value = doc[key];
    if (cond !== null && isObject(cond)) {
      const c = cond as Doc;
      if ("$type" in c) {
        return c.$type === "number" ? isNumber(value) : true;
      }
      if ("$regex" in c) {
        return new RegExp(String(c.$regex)).test(String(value ?? ""));
      }
    }
    return value === cond;
  });
}

class FakeCollection {
  docs: Doc[] = [];

  constructor(seed: Doc[] = []) {
    this.docs = seed.map((d) => ({ ...d }));
  }

  find(filter: Doc = {}) {
    let rows = this.docs.filter((d) => matchesFilter(d, filter));
    const cursor = {
      sort(spec: Record<string, 1 | -1>) {
        const [[key, dir]] = toPairs(spec) as [[string, 1 | -1]];
        rows = [...rows].sort((a, b) =>
          dir === -1
            ? (b[key] as number) - (a[key] as number)
            : (a[key] as number) - (b[key] as number),
        );
        return cursor;
      },
      limit(n: number) {
        rows = rows.slice(0, n);
        return cursor;
      },
      async toArray() {
        return rows.map((r) => ({ ...r }));
      },
    };
    return cursor;
  }

  async findOne(filter: Doc): Promise<Doc | null> {
    const hit = this.docs.find((d) => matchesFilter(d, filter));
    return hit ? { ...hit } : null;
  }

  async countDocuments(filter: Doc = {}): Promise<number> {
    return this.docs.filter((d) => matchesFilter(d, filter)).length;
  }

  async updateOne(filter: Doc, update: Doc, opts?: { upsert?: boolean }): Promise<void> {
    const set = (update.$set as Doc) ?? {};
    const setOnInsert = (update.$setOnInsert as Doc) ?? {};
    const existing = this.docs.find((d) => matchesFilter(d, filter));
    if (existing) {
      for (const [k, v] of toPairs(set)) existing[k] = v;
      return;
    }
    if (opts?.upsert) {
      const created: Doc = {};
      if (filter._id !== undefined) created._id = filter._id;
      for (const [k, v] of toPairs(setOnInsert)) created[k] = v;
      for (const [k, v] of toPairs(set)) created[k] = v;
      this.docs.push(created);
    }
  }
}

class FakeDb {
  private cols = new Map<string, FakeCollection>();

  constructor(seed: Record<string, Doc[]> = {}) {
    for (const [name, docs] of toPairs(seed)) {
      this.cols.set(name, new FakeCollection(docs));
    }
  }

  collection(name: string): FakeCollection {
    const existing = this.cols.get(name);
    if (existing) {
      return existing;
    }
    const created = new FakeCollection();
    this.cols.set(name, created);
    return created;
  }

  asDb(): mongo.Db {
    return this as unknown as mongo.Db;
  }
}

function buildFixture() {
  const coreDb = new FakeDb({
    user: [
      { _id: 1, email: "C@x.com", appScope: "orbit:company", passwordHash: "h1", status: "active" },
      { _id: 2, email: "S@x.com ", appScope: "orbit:seeker", passwordHash: "h2", status: "active" },
      { _id: 3, email: "R@x.com", appScope: "orbit:recruiter", status: "active" },
      { _id: 4, email: "T@x.com", appScope: "orbit:student", status: "active" },
      { _id: 5, email: "weird@x.com", appScope: "orbit:mysteryapp", status: "active" },
      { _id: 6, email: "forge@x.com", appScope: "forge:customer", status: "active" },
      { _id: 9999, email: "admin@x.com", appScope: "annix:admin", status: "active" },
    ],
    user_app_access: [
      { _id: 100, userId: 1 },
      { _id: 101, userId: 2 },
    ],
    passkeys: [{ _id: 200, userId: 1 }],
  });
  const orbitDb = new FakeDb({
    cv_assistant_profiles: [{ _id: 300, userId: 2 }],
  });
  return { coreDb, orbitDb };
}

describe("Orbit identity backfill (ADR-0001 M1)", () => {
  it("maps each orbit scope to its collection, quarantines unknown orbit:* scopes (dry-run writes nothing)", async () => {
    const { coreDb, orbitDb } = buildFixture();

    const plan = await runOrbitIdentityMigration(coreDb.asDb(), orbitDb.asDb(), { apply: false });

    expect(plan.perModule).toEqual({ company: 1, seeker: 1, recruiter: 1, student: 1 });
    expect(plan.totalToMigrate).toBe(4);
    expect(plan.registryRows).toBe(4);
    expect(plan.quarantine).toEqual([{ id: 5, appScope: "orbit:mysteryapp" }]);
    // forge:customer (non-orbit) is never even read into the plan.
    expect(plan.quarantine.some((q) => q.id === 6)).toBe(false);

    // Dry-run performs NO writes.
    expect(await orbitDb.collection("orbit_company_identities").countDocuments()).toBe(0);
    expect(await orbitDb.collection("identity_registry").countDocuments()).toBe(0);
    expect(await orbitDb.collection("counters").findOne({ _id: "orbit_identity" })).toBeNull();

    // Counter it WOULD set = global max id across user + identities (9999).
    expect(plan.counterToSet).toBe(9999);
    expect(plan.counterBefore).toBeNull();
  });

  it("copies preserving _id, derives emailLower, stamps module + markers, leaves user untouched", async () => {
    const { coreDb, orbitDb } = buildFixture();

    await runOrbitIdentityMigration(coreDb.asDb(), orbitDb.asDb(), { apply: true });

    const company = await orbitDb.collection("orbit_company_identities").findOne({ _id: 1 });
    expect(company?._id).toBe(1);
    expect(company?.emailLower).toBe("c@x.com");
    expect(company?.module).toBe("company");
    expect(company?.passwordHash).toBe("h1");
    expect(company?.migratedFrom).toBe("user");
    // Audit marker written (a Date instant) without referencing the Date global.
    expect(company?.migratedAt).toBeTruthy();
    expect(Object.prototype.toString.call(company?.migratedAt)).toBe("[object Date]");

    // Trailing whitespace in the source email is normalized for emailLower.
    const seeker = await orbitDb.collection("orbit_seeker_identities").findOne({ _id: 2 });
    expect(seeker?.emailLower).toBe("s@x.com");

    // Registry populated with { _id: userId, app, module, emailLower }.
    const registry = await orbitDb.collection("identity_registry").findOne({ _id: 1 });
    expect(registry).toMatchObject({
      _id: 1,
      app: "orbit",
      module: "company",
      emailLower: "c@x.com",
    });

    // Shared counter seeded to the global max.
    const counter = await orbitDb.collection("counters").findOne({ _id: "orbit_identity" });
    expect(counter?.seq).toBe(9999);

    // Source `user` row is NOT mutated (reversibility).
    const sourceUser = await coreDb.collection("user").findOne({ _id: 1 });
    expect(sourceUser?.appScope).toBe("orbit:company");
    expect(sourceUser?.emailLower).toBeUndefined();
    expect(sourceUser?.module).toBeUndefined();
  });

  it("is idempotent — re-applying produces no duplicates", async () => {
    const { coreDb, orbitDb } = buildFixture();

    await runOrbitIdentityMigration(coreDb.asDb(), orbitDb.asDb(), { apply: true });
    await runOrbitIdentityMigration(coreDb.asDb(), orbitDb.asDb(), { apply: true });

    expect(await orbitDb.collection("orbit_company_identities").countDocuments()).toBe(1);
    expect(await orbitDb.collection("orbit_seeker_identities").countDocuments()).toBe(1);
    expect(await orbitDb.collection("identity_registry").countDocuments()).toBe(4);
    const counter = await orbitDb.collection("counters").findOne({ _id: "orbit_identity" });
    expect(counter?.seq).toBe(9999);
  });

  it("only ever raises the counter, never lowers an already-higher sequence", async () => {
    const { coreDb, orbitDb } = buildFixture();
    await orbitDb
      .collection("counters")
      .updateOne({ _id: "orbit_identity" }, { $set: { seq: 50000 } }, { upsert: true });

    const plan = await runOrbitIdentityMigration(coreDb.asDb(), orbitDb.asDb(), { apply: true });

    expect(plan.counterBefore).toBe(50000);
    expect(plan.counterToSet).toBe(50000);
    const counter = await orbitDb.collection("counters").findOne({ _id: "orbit_identity" });
    expect(counter?.seq).toBe(50000);
  });
});

describe("Orbit identity verification gate (ADR-0001 M2)", () => {
  async function migratedFixture() {
    const fixture = buildFixture();
    await runOrbitIdentityMigration(fixture.coreDb.asDb(), fixture.orbitDb.asDb(), { apply: true });
    return fixture;
  }

  it("PASSes every check on a clean migrated set", async () => {
    const { coreDb, orbitDb } = await migratedFixture();

    const result = await verifyOrbitIdentityMigration(coreDb.asDb(), orbitDb.asDb());

    expect(result.ok).toBe(true);
    expect(result.checks.every((c) => c.status !== "FAIL")).toBe(true);
    expect(result.checks.find((c) => c.name === "counter-high-water")?.status).toBe("PASS");
    expect(result.checks.find((c) => c.name === "fk-resolution")?.status).toBe("PASS");
  });

  it("FAILs when an _id is duplicated across two identity collections", async () => {
    const { coreDb, orbitDb } = await migratedFixture();
    // Tamper: company id 1 also appears in the seeker collection.
    await orbitDb
      .collection("orbit_seeker_identities")
      .updateOne(
        { _id: 1 },
        { $set: { module: "seeker", emailLower: "c@x.com" } },
        { upsert: true },
      );

    const result = await verifyOrbitIdentityMigration(coreDb.asDb(), orbitDb.asDb());

    expect(result.ok).toBe(false);
    expect(result.checks.find((c) => c.name === "disjoint-ids")?.status).toBe("FAIL");
    expect(result.checks.find((c) => c.name === "fk-resolution")?.status).toBe("FAIL");
  });

  it("FAILs on a per-module count mismatch (an un-migrated orbit user)", async () => {
    const { coreDb, orbitDb } = await migratedFixture();
    // A new company user appears in core but was never migrated.
    coreDb.collection("user").docs.push({
      _id: 7,
      email: "c2@x.com",
      appScope: "orbit:company",
      status: "active",
    });

    const result = await verifyOrbitIdentityMigration(coreDb.asDb(), orbitDb.asDb());

    expect(result.ok).toBe(false);
    expect(result.checks.find((c) => c.name === "count:company")?.status).toBe("FAIL");
    expect(result.checks.find((c) => c.name === "disjoint-ids")?.status).toBe("PASS");
  });
});
