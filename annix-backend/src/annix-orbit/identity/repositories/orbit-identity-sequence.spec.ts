import { isNumber, toPairs } from "es-toolkit/compat";
import type { Connection } from "mongoose";
import { MongoOrbitCompanyIdentityRepository } from "./orbit-company-identity.repository.mongo";
import { ORBIT_IDENTITY_COLLECTIONS } from "./orbit-identity.repository.mongo";
import { MongoOrbitRecruiterIdentityRepository } from "./orbit-recruiter-identity.repository.mongo";
import { MongoOrbitSeekerIdentityRepository } from "./orbit-seeker-identity.repository.mongo";
import { MongoOrbitStudentIdentityRepository } from "./orbit-student-identity.repository.mongo";

// No live Mongo / mongodb-memory-server exists in this repo (the Orbit specs are
// pure-unit with hand-rolled stores, see orbit-storage-migrations.spec.ts). We
// drive REAL MongoCrudRepository subclasses against a faithful fake of the exact
// native-driver subset the id-sequencing path uses: a shared `counters` document
// ($inc / $set upsert) plus `find().sort().limit().toArray()` for the reseed
// high-water scan. This proves the contract that matters for ADR-0001 #1: the
// four module collections mint from ONE `orbit_identity` sequence, and a reseed
// computes the GLOBAL max id (core `user` + all four identity collections).

type Doc = Record<string, unknown>;

const USER_COLLECTION = "user";

class FakeNativeCollection {
  docs: Doc[] = [];

  find(_filter: Doc) {
    let rows = this.docs.filter((d) => isNumber(d._id));
    return {
      sort(spec: Record<string, 1 | -1>) {
        const [[key, dir]] = toPairs(spec) as [[string, 1 | -1]];
        rows = [...rows].sort((a, b) =>
          dir === -1
            ? (b[key] as number) - (a[key] as number)
            : (a[key] as number) - (b[key] as number),
        );
        return this;
      },
      limit(n: number) {
        rows = rows.slice(0, n);
        return this;
      },
      async toArray() {
        return rows;
      },
    };
  }

  // `counters` contract: $inc on an existing doc, null when the doc is absent
  // (mirrors the real driver's findOneAndUpdate without upsert — this is what
  // forces the reseed path).
  async findOneAndUpdate(filter: Doc, update: Doc): Promise<Doc | null> {
    const existing = this.docs.find((d) => d._id === filter._id);
    if (!existing) {
      return null;
    }
    const inc = (update.$inc as { seq?: number } | undefined)?.seq;
    if (inc !== undefined) {
      existing.seq = ((existing.seq as number) ?? 0) + inc;
    }
    return { ...existing };
  }

  async updateOne(filter: Doc, update: Doc, opts?: { upsert?: boolean }): Promise<void> {
    const set = (update.$set as Doc) ?? {};
    const existing = this.docs.find((d) => d._id === filter._id);
    if (existing) {
      for (const [k, v] of toPairs(set)) existing[k] = v;
    } else if (opts?.upsert) {
      this.docs.push({ _id: filter._id, ...set });
    }
  }
}

class FakeNativeDb {
  private cols = new Map<string, FakeNativeCollection>();

  collection(name: string): FakeNativeCollection {
    const existing = this.cols.get(name);
    if (existing) {
      return existing;
    }
    const created = new FakeNativeCollection();
    this.cols.set(name, created);
    return created;
  }
}

function makeSchema() {
  const paths: Record<string, { instance: string; options?: Record<string, unknown> }> = {
    _id: { instance: "Number" },
    email: { instance: "String" },
    emailLower: { instance: "String" },
    createdAt: { instance: "Date", options: {} },
    updatedAt: { instance: "Date", options: {} },
  };
  return {
    paths,
    virtuals: {} as Record<string, unknown>,
    path(name: string) {
      return paths[name] ?? null;
    },
  };
}

// A faithful stand-in for a Mongoose Model: `new`-able (so create() can build a
// document and save it into the shared orbit db) AND carrying the static
// collection/schema/db surface MongoCrudRepository reads.
function makeIdentityModel(collectionName: string, orbitDb: FakeNativeDb) {
  return class FakeIdentityModel {
    static collection = { collectionName };
    static schema = makeSchema();
    static db = { db: orbitDb, models: {} as Record<string, unknown> };

    private readonly doc: Doc;

    constructor(doc: Doc) {
      this.doc = { ...doc };
    }

    async save(): Promise<void> {
      orbitDb.collection(collectionName).docs.push({ ...this.doc });
    }

    toObject(): Doc {
      return { ...this.doc };
    }
  };
}

// `module` is intentionally omitted: the schema defaults it per collection, and
// leaving it off keeps the sample assignable to every module's DeepPartial entity.
function newSampleData(module: string) {
  return {
    email: `${module}@example.com`,
    emailLower: `${module}@example.com`,
    emailVerified: false,
    status: "active",
  };
}

// Exposes the protected reseed hook so we can assert it directly.
class ProbeCompanyRepo extends MongoOrbitCompanyIdentityRepository {
  reseedFloor(): Promise<number> {
    return this.highestReseedId();
  }
}

function buildSuite() {
  const orbitDb = new FakeNativeDb();
  const coreDb = new FakeNativeDb();
  const coreConnection = { db: coreDb } as unknown as Connection;

  const company = new MongoOrbitCompanyIdentityRepository(
    makeIdentityModel("orbit_company_identities", orbitDb) as never,
    coreConnection,
  );
  const seeker = new MongoOrbitSeekerIdentityRepository(
    makeIdentityModel("orbit_seeker_identities", orbitDb) as never,
    coreConnection,
  );
  const recruiter = new MongoOrbitRecruiterIdentityRepository(
    makeIdentityModel("orbit_recruiter_identities", orbitDb) as never,
    coreConnection,
  );
  const student = new MongoOrbitStudentIdentityRepository(
    makeIdentityModel("orbit_student_identities", orbitDb) as never,
    coreConnection,
  );

  return { orbitDb, coreDb, company, seeker, recruiter, student };
}

describe("Orbit identity shared id sequence (ADR-0001 M0)", () => {
  it("all four module repos draw from one monotonic sequence with no id collisions", async () => {
    const { company, seeker, recruiter, student } = buildSuite();

    const created: Array<{ id: number }> = [];
    // Interleave creates across all four collections, twice.
    for (const _round of [0, 1]) {
      created.push(await company.create(newSampleData("company")));
      created.push(await seeker.create(newSampleData("seeker")));
      created.push(await recruiter.create(newSampleData("recruiter")));
      created.push(await student.create(newSampleData("student")));
    }

    const ids = created.map((entity) => entity.id);
    // No collisions, and exactly one shared run 1..8 across the four collections.
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("reseed uses the GLOBAL max id (core user + all identity collections), not one collection", async () => {
    const { orbitDb, coreDb, company } = buildSuite();

    // Sibling identity collections hold small ids; the core `user` collection
    // holds the true high-water mark of the global id space.
    orbitDb.collection("orbit_company_identities").docs.push({ _id: 10 });
    orbitDb.collection("orbit_seeker_identities").docs.push({ _id: 12 });
    coreDb.collection(USER_COLLECTION).docs.push({ _id: 5000 });

    // No `orbit_identity` counter doc yet → the next create must reseed.
    const created = await company.create(newSampleData("company"));

    // 5000 (global max from `user`) + 1, NOT 12 + 1 (the orbit collections' max).
    expect(created.id).toBe(5001);
    expect(created.id).toBeGreaterThan(5000);
  });

  it("highestReseedId returns the global max directly (not the repo's own collection max)", async () => {
    const orbitDb = new FakeNativeDb();
    const coreDb = new FakeNativeDb();
    const coreConnection = { db: coreDb } as unknown as Connection;
    const probe = new ProbeCompanyRepo(
      makeIdentityModel("orbit_company_identities", orbitDb) as never,
      coreConnection,
    );

    orbitDb.collection("orbit_company_identities").docs.push({ _id: 3 });
    orbitDb.collection("orbit_recruiter_identities").docs.push({ _id: 77 });
    coreDb.collection(USER_COLLECTION).docs.push({ _id: 4200 });

    await expect(probe.reseedFloor()).resolves.toBe(4200);
  });

  it("scans exactly the four identity collections plus core user", () => {
    expect([...ORBIT_IDENTITY_COLLECTIONS]).toEqual([
      "orbit_company_identities",
      "orbit_seeker_identities",
      "orbit_recruiter_identities",
      "orbit_student_identities",
    ]);
  });
});
