import { isObject, keys, toPairs } from "es-toolkit/compat";
import type { mongo } from "mongoose";
import {
  down as downDedup,
  up as upDedup,
} from "../../../migrations-mongo-orbit/20260618120000-candidate-job-match-and-external-job-indexes";
import {
  down as downSplit,
  up as upSplit,
} from "../../../migrations-mongo-orbit/20260618130000-split-external-job-embeddings";

// Migration crash-safety / idempotency suite for the embedding-split rollout.
// migrate-mongo runs forward-only against a live Atlas Orbit cluster; a deploy
// can be interrupted between any two batch writes, and `release_command` re-runs
// `up` on the next deploy — so `up` must be safe to run twice and after a partial
// run, and `down` must fully restore.
//
// No mongodb-memory-server / live Mongo exists in this repo, so we drive the
// migrations against a faithful in-memory fake of the exact native-driver subset
// they use (listCollections / createCollection / find().cursor() / bulkWrite /
// aggregate group / deleteMany / createIndex / drop). The fake replays the same
// document mutations the real driver would, so the migration's own control flow
// (copy-then-unset, re-run convergence, restore) is what's under test.

type Doc = Record<string, unknown>;

function applyBulkUpdate(doc: Doc, update: Doc): void {
  const set = update.$set as Doc | undefined;
  if (set) for (const [k, v] of toPairs(set)) doc[k] = v;
  const unset = update.$unset as Doc | undefined;
  if (unset) for (const k of keys(unset)) delete doc[k];
}

function matches(doc: Doc, filter: Doc): boolean {
  return toPairs(filter).every(([key, cond]) => {
    const value = doc[key];
    if (cond !== null && isObject(cond)) {
      const c = cond as Doc;
      if ("$in" in c) return (c.$in as unknown[]).includes(value);
      if ("$exists" in c && "$ne" in c) {
        return (value !== undefined) === c.$exists && value !== c.$ne;
      }
      if ("$exists" in c) return (value !== undefined) === c.$exists;
      if ("$ne" in c) return value !== c.$ne;
    }
    return value === cond;
  });
}

class FakeCollection {
  docs: Doc[] = [];
  indexes = new Map<string, Doc>();

  constructor(seed: Doc[] = []) {
    this.docs = seed.map((d) => ({ ...d }));
  }

  find(filter: Doc, opts?: { projection?: Doc }) {
    const selected = this.docs
      .filter((d) => matches(d, filter))
      .map((d) => projectKeepingId(d, opts?.projection));
    return {
      cursor() {
        return selected;
      },
      [Symbol.asyncIterator]() {
        let i = 0;
        return {
          async next() {
            if (i < selected.length) return { value: selected[i++], done: false as const };
            return { value: undefined, done: true as const };
          },
        };
      },
    };
  }

  async bulkWrite(ops: mongo.AnyBulkWriteOperation[]): Promise<void> {
    for (const op of ops) {
      const u = (op as { updateOne?: { filter: Doc; update: Doc; upsert?: boolean } }).updateOne;
      if (!u) continue;
      const existing = this.docs.find((d) => matches(d, u.filter));
      if (existing) {
        applyBulkUpdate(existing, u.update);
      } else if (u.upsert) {
        const created: Doc = { ...u.filter };
        applyBulkUpdate(created, u.update);
        this.docs.push(created);
      }
    }
  }

  // Mirrors the fixed group-by-composite-key pipeline used by migration 120000.
  aggregate(): { toArray: () => Promise<Array<{ _id: Doc; ids: number[] }>> } {
    const groups = new Map<string, { _id: Doc; ids: number[] }>();
    for (const doc of this.docs) {
      if (doc.candidateId == null || doc.externalJobId == null) continue;
      const key = `${doc.candidateId}|${doc.externalJobId}`;
      const bucket = groups.get(key) ?? {
        _id: { candidateId: doc.candidateId, externalJobId: doc.externalJobId },
        ids: [],
      };
      bucket.ids.push(doc._id as number);
      groups.set(key, bucket);
    }
    const aggregated = [...groups.values()].filter((g) => g.ids.length > 1);
    return { toArray: async () => aggregated };
  }

  async deleteMany(filter: Doc): Promise<{ deletedCount: number }> {
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => !matches(d, filter));
    return { deletedCount: before - this.docs.length };
  }

  async createIndex(_keys: Doc, options: { name: string; unique?: boolean }): Promise<string> {
    this.indexes.set(options.name, { keys: _keys, unique: options.unique ?? false });
    return options.name;
  }

  async dropIndex(name: string): Promise<void> {
    if (!this.indexes.delete(name)) throw new Error(`index ${name} not found`);
  }
}

function projectKeepingId(doc: Doc, projection?: Doc): Doc {
  if (!projection) return { ...doc };
  const keep = toPairs(projection)
    .filter(([, v]) => v === 1)
    .map(([k]) => k);
  const out: Doc = { _id: doc._id };
  for (const k of keep) if (k in doc) out[k] = doc[k];
  return out;
}

class FakeDb {
  private collections = new Map<string, FakeCollection>();
  dropped: string[] = [];

  constructor(seed: Record<string, Doc[]> = {}) {
    for (const [name, docs] of toPairs(seed)) {
      this.collections.set(name, new FakeCollection(docs));
    }
  }

  collection(name: string): FakeCollection {
    const existing = this.collections.get(name);
    if (existing) return existing;
    const created = new FakeCollection();
    this.collections.set(name, created);
    return created;
  }

  listCollections(query: { name: string }) {
    const present = this.collections.has(query.name);
    return { toArray: async () => (present ? [{ name: query.name }] : []) };
  }

  async createCollection(name: string): Promise<void> {
    if (!this.collections.has(name)) this.collections.set(name, new FakeCollection());
  }

  asMongo(): mongo.Db {
    return {
      collection: (name: string) => this.collection(name),
      listCollections: (q: { name: string }) => this.listCollections(q),
      createCollection: (name: string) => this.createCollection(name),
    } as unknown as mongo.Db;
  }
}

const JOBS = "cv_assistant_external_jobs";
const EMBEDDINGS = "cv_assistant_external_job_embeddings";
const MATCHES = "cv_assistant_candidate_job_matches";

describe("migration 20260618130000 — split external-job embeddings", () => {
  function seedJobs() {
    return {
      [JOBS]: [
        { _id: 1, title: "A", embedding: Buffer.from([1, 2, 3]) },
        { _id: 2, title: "B", embedding: Buffer.from([4, 5, 6]) },
        { _id: 3, title: "C" },
      ],
    };
  }

  it("up copies each job's embedding into the sibling collection and unsets it on the job", async () => {
    const db = new FakeDb(seedJobs());
    await upSplit(db.asMongo());

    const jobs = db.collection(JOBS).docs;
    const embeddings = db.collection(EMBEDDINGS).docs;
    expect(jobs.every((j) => !("embedding" in j))).toBe(true);
    expect(embeddings.map((e) => e._id).sort((a, b) => (a as number) - (b as number))).toEqual([
      1, 2,
    ]);
    expect(embeddings.find((e) => e._id === 1)?.embedding).toEqual(Buffer.from([1, 2, 3]));
    expect(db.collection(JOBS).docs.find((j) => j._id === 3)).toBeDefined();
  });

  it("up is idempotent — a second run produces no duplicate siblings", async () => {
    const db = new FakeDb(seedJobs());
    await upSplit(db.asMongo());
    await upSplit(db.asMongo());

    const embeddings = db.collection(EMBEDDINGS).docs;
    expect(embeddings).toHaveLength(2);
    expect(embeddings.filter((e) => e._id === 1)).toHaveLength(1);
  });

  it("recovers from a partial run — siblings copied but a job not yet unset", async () => {
    const db = new FakeDb(seedJobs());
    // Simulate the crash window: embedding already copied for job 1, but the
    // matching $unset never ran, so job 1 still carries its embedding.
    db.collection(EMBEDDINGS).docs.push({ _id: 1, embedding: Buffer.from([1, 2, 3]) });

    await upSplit(db.asMongo());

    const jobs = db.collection(JOBS).docs;
    const embeddings = db.collection(EMBEDDINGS).docs;
    expect(jobs.every((j) => !("embedding" in j))).toBe(true);
    expect(embeddings.filter((e) => e._id === 1)).toHaveLength(1);
    expect(embeddings).toHaveLength(2);
  });

  it("down restores embeddings onto the jobs and drops the sibling collection", async () => {
    const db = new FakeDb(seedJobs());
    await upSplit(db.asMongo());

    const dropped: string[] = [];
    const mongoDb = db.asMongo();
    const realCollection = mongoDb.collection.bind(mongoDb);
    (mongoDb as unknown as { collection: (n: string) => unknown }).collection = (name: string) => {
      const col = realCollection(name) as FakeCollection & { drop?: () => Promise<void> };
      col.drop = async () => {
        dropped.push(name);
      };
      return col;
    };

    await downSplit(mongoDb);

    const jobs = db.collection(JOBS).docs;
    expect(jobs.find((j) => j._id === 1)?.embedding).toEqual(Buffer.from([1, 2, 3]));
    expect(jobs.find((j) => j._id === 2)?.embedding).toEqual(Buffer.from([4, 5, 6]));
    expect(dropped).toContain(EMBEDDINGS);
  });
});

describe("migration 20260618120000 — candidate-job-match dedup + unique index", () => {
  it("up keeps only the lowest _id per (candidateId, externalJobId) and creates the unique index", async () => {
    const db = new FakeDb({
      [MATCHES]: [
        { _id: 30, candidateId: 1, externalJobId: 5 },
        { _id: 10, candidateId: 1, externalJobId: 5 },
        { _id: 20, candidateId: 1, externalJobId: 5 },
        { _id: 40, candidateId: 2, externalJobId: 9 },
      ],
    });

    await upDedup(db.asMongo());

    const matches = db.collection(MATCHES);
    const surviving = matches.docs.filter((d) => d.candidateId === 1 && d.externalJobId === 5);
    expect(surviving).toHaveLength(1);
    expect(surviving[0]._id).toBe(10);
    expect(matches.docs).toHaveLength(2);

    const unique = matches.indexes.get("candidate_id_external_job_id_unique");
    expect(unique).toBeDefined();
    expect(unique?.unique).toBe(true);
  });

  it("up is idempotent — a second run leaves the deduped set and index untouched", async () => {
    const db = new FakeDb({
      [MATCHES]: [
        { _id: 10, candidateId: 1, externalJobId: 5 },
        { _id: 20, candidateId: 1, externalJobId: 5 },
      ],
    });
    await upDedup(db.asMongo());
    await upDedup(db.asMongo());

    expect(db.collection(MATCHES).docs).toHaveLength(1);
    expect(db.collection(MATCHES).docs[0]._id).toBe(10);
  });

  it("down drops the indexes it created", async () => {
    const db = new FakeDb({ [MATCHES]: [] });
    await upDedup(db.asMongo());
    expect(db.collection(MATCHES).indexes.size).toBeGreaterThan(0);

    await downDedup(db.asMongo());
    expect(db.collection(MATCHES).indexes.has("candidate_id_external_job_id_unique")).toBe(false);
  });
});
