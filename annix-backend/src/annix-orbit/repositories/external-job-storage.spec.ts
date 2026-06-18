import { isObject, toPairs } from "es-toolkit/compat";
import { fromISO, now } from "../../lib/datetime";
import { encodeEmbedding } from "../lib/embedding-codec";
import { MongoExternalJobRepository } from "./external-job.repository.mongo";

// Storage-layer suite for the job-ingestion split (issue #337 follow-up):
//   - the embedding now lives in a SIBLING collection, not on the job document;
//   - deleteSiblings is the single fan-out point that keeps the embedding /
//     match / alternate collections free of orphans on every delete path.
//
// The Orbit specs in this repo are pure-unit with hand-rolled in-memory stores
// (see ingest-flow.e2e-spec.ts / seeker-flow.e2e-spec.ts) — there is no
// mongodb-memory-server dependency and no live Mongo connection in any test.
// We follow that convention here with a faithful in-memory fake of the exact
// Mongoose query subset these repository methods use, so the REAL repository
// code paths (branch selection, fan-out, source-of-truth reads) are exercised.

type Doc = Record<string, unknown>;

function matchesFilter(doc: Doc, filter: Doc): boolean {
  return toPairs(filter).every(([key, condition]) => {
    if (key === "$or") {
      return (condition as Doc[]).some((clause) => matchesFilter(doc, clause));
    }
    if (key === "$and") {
      return (condition as Doc[]).every((clause) => matchesFilter(doc, clause));
    }
    const value = doc[key];
    if (condition !== null && isObject(condition)) {
      const cond = condition as Doc;
      if ("$in" in cond) return (cond.$in as unknown[]).includes(value);
      if ("$nin" in cond) return !(cond.$nin as unknown[]).includes(value);
      if ("$ne" in cond) return value !== cond.$ne;
      if ("$exists" in cond) return (value !== undefined) === cond.$exists;
      if ("$gt" in cond) return value != null && (value as number) > (cond.$gt as number);
      if ("$lt" in cond) return value != null && (value as number) < (cond.$lt as number);
      if ("$gte" in cond) return value != null && (value as number) >= (cond.$gte as number);
      if ("$lte" in cond) return value != null && (value as number) <= (cond.$lte as number);
    }
    return value === condition;
  });
}

function sortableValue(raw: unknown): number {
  if (raw == null) return -Infinity;
  const asDate = raw as { getTime?: () => number };
  return typeof asDate.getTime === "function" ? asDate.getTime() : (raw as number);
}

function applySort(rows: Doc[], sort: Record<string, number> | null): Doc[] {
  if (!sort) return rows;
  const sortEntries = toPairs(sort);
  return [...rows].sort((a, b) => {
    for (const [field, dir] of sortEntries) {
      const an = sortableValue(a[field]);
      const bn = sortableValue(b[field]);
      if (an !== bn) return an < bn ? -dir : dir;
    }
    return 0;
  });
}

// A chainable query thenable mirroring Mongoose's find()/findById() builder.
// `single` mirrors findById/findOne (resolves to one doc or null).
function buildQuery(getRows: () => Doc[], single = false) {
  let rows = getRows();
  let projection: Record<string, number> | null = null;
  const result = () => {
    const projected = project(rows, projection);
    return single ? (projected[0] ?? null) : projected;
  };
  const builder: Record<string, unknown> = {
    select(proj: Record<string, number>) {
      projection = proj;
      return builder;
    },
    sort(s: Record<string, number>) {
      rows = applySort(rows, s);
      return builder;
    },
    limit(n: number) {
      rows = rows.slice(0, n);
      return builder;
    },
    lean() {
      return builder;
    },
    session() {
      return builder;
    },
    allowDiskUse() {
      return builder;
    },
    populate() {
      return builder;
    },
    async exec() {
      return result();
    },
    async *cursor() {
      for (const row of project(rows, projection)) yield row;
    },
  };
  return builder;
}

function project(rows: Doc[], projection: Record<string, number> | null): Doc[] {
  if (!projection) return rows.map((r) => ({ ...r }));
  const keep = toPairs(projection)
    .filter(([, v]) => v === 1)
    .map(([k]) => k);
  if (keep.length === 0) return rows.map((r) => ({ ...r }));
  return rows.map((r) => Object.fromEntries(keep.map((k) => [k, r[k]])));
}

class FakeCollection {
  rows: Doc[] = [];

  seed(docs: Doc[]): void {
    this.rows = docs.map((d) => ({ ...d }));
  }

  find(filter: Doc = {}, projOpt?: { projection?: Record<string, number> }) {
    const q = buildQuery(() => this.rows.filter((r) => matchesFilter(r, filter)));
    if (projOpt?.projection) (q as { select: (p: unknown) => unknown }).select(projOpt.projection);
    return q;
  }

  findById(id: unknown) {
    return buildQuery(() => this.rows.filter((r) => r._id === id), true);
  }

  updateMany(filter: Doc, update: Doc) {
    return {
      exec: async () => {
        const set = (update.$set as Doc) ?? {};
        const affected = this.rows.filter((r) => matchesFilter(r, filter));
        for (const row of affected) for (const [k, v] of toPairs(set)) row[k] = v;
        return { modifiedCount: affected.length };
      },
    };
  }

  countDocuments(filter: Doc = {}) {
    const count = () => this.rows.filter((r) => matchesFilter(r, filter)).length;
    const pending = Promise.resolve().then(count);
    return Object.assign(pending, { exec: async () => count() });
  }

  deleteMany(filter: Doc) {
    return {
      exec: async () => {
        const before = this.rows.length;
        this.rows = this.rows.filter((r) => !matchesFilter(r, filter));
        return { deletedCount: before - this.rows.length };
      },
    };
  }

  findByIdAndDelete(id: unknown) {
    return {
      exec: async () => {
        this.rows = this.rows.filter((r) => r._id !== id);
        return null;
      },
    };
  }
}

interface Harness {
  repo: MongoExternalJobRepository;
  jobs: FakeCollection;
  embeddings: FakeCollection;
  matches: FakeCollection;
  alternates: FakeCollection;
}

function buildHarness(retentionCap: number | null = null): Harness {
  const jobs = new FakeCollection();
  const embeddings = new FakeCollection();
  const matches = new FakeCollection();
  const alternates = new FakeCollection();

  const settingsCollection = {
    async findOne() {
      return retentionCap === null
        ? null
        : { _id: "default", externalJobRetentionCap: retentionCap };
    },
  };

  const jobModel = {
    ...asModel(jobs),
    schema: { paths: {}, virtuals: {} },
    db: {
      db: { collection: () => settingsCollection },
      model: () => ({ find: () => buildQuery(() => []) }),
    },
  };

  const repo = new MongoExternalJobRepository(
    jobModel as never,
    asModel(embeddings) as never,
    asModel(matches) as never,
    asModel(alternates) as never,
  );
  return { repo, jobs, embeddings, matches, alternates };
}

function asModel(collection: FakeCollection): Record<string, unknown> {
  return {
    find: (f?: Doc, p?: { projection?: Record<string, number> }) => collection.find(f, p),
    findById: (id: unknown) => collection.findById(id),
    countDocuments: (f?: Doc) => collection.countDocuments(f),
    deleteMany: (f: Doc) => collection.deleteMany(f),
    findByIdAndDelete: (id: unknown) => collection.findByIdAndDelete(id),
    updateMany: (f: Doc, u: Doc) => collection.updateMany(f, u),
  };
}

const VECTOR = encodeEmbedding([0.1, 0.2, 0.3]);

function seedJob(jobs: FakeCollection, over: Partial<Doc> = {}): Doc {
  const base: Doc = {
    _id: 1,
    title: "Boilermaker",
    canonicalCategory: "engineering",
    country: "za",
    lastSeenAt: fromISO("2026-06-01T00:00:00Z").toJSDate(),
  };
  return { ...base, ...over };
}

describe("MongoExternalJobRepository — embedding source-of-truth (C1/H-1)", () => {
  it("jobEmbedding returns the sibling vector, and null when no sibling exists", async () => {
    const { repo, embeddings } = buildHarness();
    embeddings.seed([{ _id: 1, embedding: VECTOR }]);

    expect(await repo.jobEmbedding(1)).toEqual(VECTOR);
    expect(await repo.jobEmbedding(2)).toBeNull();
  });

  it("jobEmbeddings batch-reads only the ids with a sibling vector", async () => {
    const { repo, embeddings } = buildHarness();
    embeddings.seed([
      { _id: 1, embedding: VECTOR },
      { _id: 3, embedding: VECTOR },
    ]);

    const map = await repo.jobEmbeddings([1, 2, 3]);
    expect([...map.keys()].sort()).toEqual([1, 3]);
    expect(map.get(1)).toEqual(VECTOR);
    expect(map.has(2)).toBe(false);

    expect((await repo.jobEmbeddings([])).size).toBe(0);
  });

  it("a job with NO sibling embedding is absent from jobEmbeddingBatches", async () => {
    const { repo, jobs, embeddings } = buildHarness();
    jobs.seed([seedJob(jobs, { _id: 1 }), seedJob(jobs, { _id: 2 })]);
    embeddings.seed([{ _id: 1, embedding: VECTOR }]);

    const ids = await collectBatchIds(repo, null, null, 50);
    expect(ids).toEqual([1]);
  });

  it("the filtered and unfiltered branches return the identical id-set for a single-category fixture", async () => {
    const { repo, jobs, embeddings } = buildHarness();
    jobs.seed([
      seedJob(jobs, { _id: 1, canonicalCategory: "engineering", country: "za" }),
      seedJob(jobs, { _id: 2, canonicalCategory: "engineering", country: "za" }),
    ]);
    embeddings.seed([
      { _id: 1, embedding: VECTOR },
      { _id: 2, embedding: VECTOR },
    ]);

    const unfiltered = await collectBatchIds(repo, null, null, 50);
    const filtered = await collectBatchIds(repo, ["engineering"], ["za"], 50);

    expect(filtered).toEqual(unfiltered);
    expect(filtered).toEqual([1, 2]);
  });
});

describe("MongoExternalJobRepository — retention fan-out completeness (deleteSiblings invariant)", () => {
  function seedFanOut(h: Harness): void {
    h.jobs.seed([
      seedJob(h.jobs, { _id: 1, lastSeenAt: fromISO("2020-01-01T00:00:00Z").toJSDate() }),
    ]);
    h.embeddings.seed([{ _id: 1, embedding: VECTOR }]);
    h.matches.seed([
      { _id: 11, externalJobId: 1, candidateId: 100 },
      { _id: 12, externalJobId: 1, candidateId: 200 },
    ]);
    h.alternates.seed([{ _id: 21, canonicalExternalJobId: 1, sourceId: 9 }]);
  }

  function expectNoOrphans(h: Harness): void {
    expect(h.jobs.rows.filter((r) => r._id === 1)).toHaveLength(0);
    expect(h.embeddings.rows.filter((r) => r._id === 1)).toHaveLength(0);
    expect(h.matches.rows.filter((r) => r.externalJobId === 1)).toHaveLength(0);
    expect(h.alternates.rows.filter((r) => r.canonicalExternalJobId === 1)).toHaveLength(0);
  }

  it("deleteById removes the job and all of its siblings", async () => {
    const h = buildHarness();
    seedFanOut(h);
    await h.repo.deleteById(1);
    expectNoOrphans(h);
  });

  it("deleteByIds removes the job and all of its siblings", async () => {
    const h = buildHarness();
    seedFanOut(h);
    await h.repo.deleteByIds([1]);
    expectNoOrphans(h);
  });

  it("enforceRetentionCap (overage path) fans out to siblings of every trimmed job", async () => {
    const h = buildHarness(0);
    seedFanOut(h);
    const deleted = await h.repo.enforceRetentionCap();
    expect(deleted).toBe(1);
    expectNoOrphans(h);
  });

  it("expireStaleJobs (expired path) fans out to siblings of every removed job", async () => {
    const h = buildHarness();
    seedFanOut(h);
    h.jobs.rows[0].expiresAt = fromISO("2020-02-01T00:00:00Z").toJSDate();
    await h.repo.expireStaleJobs();
    expectNoOrphans(h);
  });

  it("enforceRetentionCap no-ops (and touches no siblings) when below the cap", async () => {
    const h = buildHarness(1000);
    seedFanOut(h);
    const deleted = await h.repo.enforceRetentionCap();
    expect(deleted).toBe(0);
    expect(h.embeddings.rows).toHaveLength(1);
    expect(h.matches.rows).toHaveLength(2);
    expect(h.alternates.rows).toHaveLength(1);
  });
});

describe("MongoExternalJobRepository — retention final-state invariant (H-2)", () => {
  // The post-cycle stable invariant: however many jobs several sources pushed in,
  // once enforceRetentionCap has run the pool sits at exactly the effective cap.
  // This asserts the final state only — not any transient mid-cycle peak (the
  // interim-trim mechanism is exercised elsewhere).
  it("after enforcement the job count equals the cap with multiple sources over the cap", async () => {
    const cap = 5;
    const h = buildHarness(cap);
    const overCap = 17;
    h.jobs.seed(
      Array.from({ length: overCap }, (_, i) => ({
        _id: i + 1,
        sourceId: (i % 3) + 1,
        title: `Job ${i + 1}`,
        lastSeenAt: fromISO(`2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`).toJSDate(),
      })),
    );
    h.embeddings.seed(
      Array.from({ length: overCap }, (_, i) => ({ _id: i + 1, embedding: VECTOR })),
    );

    const deleted = await h.repo.enforceRetentionCap();

    expect(h.jobs.rows).toHaveLength(cap);
    expect(deleted).toBe(overCap - cap);
    // The freshest (latest lastSeenAt) survive; the oldest are trimmed.
    expect(h.jobs.rows.map((r) => r._id).sort((a, b) => (a as number) - (b as number))).toEqual([
      13, 14, 15, 16, 17,
    ]);
    // Sibling embeddings for trimmed jobs are gone; survivors keep theirs.
    expect(
      h.embeddings.rows.map((r) => r._id).sort((a, b) => (a as number) - (b as number)),
    ).toEqual([13, 14, 15, 16, 17]);
  });

  it("a no-op enforcement (cap not exceeded) returns zero and leaves the pool intact", async () => {
    const cap = 50;
    const h = buildHarness(cap);
    h.jobs.seed(
      Array.from({ length: 10 }, (_, i) => ({ _id: i + 1, lastSeenAt: now().toJSDate() })),
    );

    const deleted = await h.repo.enforceRetentionCap();

    expect(deleted).toBe(0);
    expect(h.jobs.rows).toHaveLength(10);
  });
});

describe("MongoExternalJobRepository — findDuplicateCanonicalJob (indexed titleKey lookup, M1)", () => {
  it("matches an exact titleKey + country across a different source with a location match", async () => {
    const { repo, jobs } = buildHarness();
    jobs.seed([
      {
        _id: 1,
        title: "Senior Boilermaker",
        titleKey: "senior boilermaker",
        country: "za",
        locationArea: "Johannesburg",
        company: "Acme Steel",
        sourceId: 5,
      },
    ]);

    const match = await repo.findDuplicateCanonicalJob(
      "Senior Boilermaker",
      9,
      "za",
      "johannesburg",
      "",
    );
    expect(match?.id).toBe(1);
  });

  it("excludes the same source even when the titleKey is identical", async () => {
    const { repo, jobs } = buildHarness();
    jobs.seed([
      {
        _id: 1,
        title: "Boilermaker",
        titleKey: "boilermaker",
        country: "za",
        locationArea: "Durban",
        company: "Acme",
        sourceId: 9,
      },
    ]);

    const match = await repo.findDuplicateCanonicalJob("Boilermaker", 9, "za", "durban", "");
    expect(match).toBeNull();
  });

  it("does not match when the titleKey differs", async () => {
    const { repo, jobs } = buildHarness();
    jobs.seed([
      {
        _id: 1,
        title: "Welder",
        titleKey: "welder",
        country: "za",
        locationArea: "Durban",
        company: "Acme",
        sourceId: 5,
      },
    ]);

    const match = await repo.findDuplicateCanonicalJob("Boilermaker", 9, "za", "durban", "");
    expect(match).toBeNull();
  });
});

async function collectBatchIds(
  repo: MongoExternalJobRepository,
  categoryPool: string[] | null,
  countries: string[] | null,
  batchSize: number,
): Promise<number[]> {
  const ids: number[] = [];
  for await (const batch of repo.jobEmbeddingBatches(categoryPool, countries, batchSize)) {
    for (const item of batch) ids.push(item.id);
  }
  return ids.sort((a, b) => a - b);
}
