import { toPairs } from "es-toolkit/compat";
import type { MatchScores } from "./candidate-job-match.repository";
import { MongoCandidateJobMatchRepository } from "./candidate-job-match.repository.mongo";

// H-3 regression guard for the unique (candidateId, externalJobId) index added in
// migration 20260618120000 plus the findOneAndUpdate(upsert) rewrite of
// upsertScoredMatch. Before the fix two concurrent matches for the same pair
// raced to insert and the loser threw E11000 (or wrote a duplicate row).
//
// There is no live Mongo / mongodb-memory-server in this repo (the Orbit specs
// are pure-unit with hand-rolled stores), so we model the contract the unique
// index + atomic upsert give us: a single keyed row, no duplicate-key throw, and
// last-write-wins scores. The fake serialises findOneAndUpdate on the unique key
// exactly as the index forces Mongo to — a parallel insert can never create a
// second row for the same (candidateId, externalJobId).

type Doc = Record<string, unknown>;

function sameKey(doc: Doc, filter: Doc): boolean {
  return doc.candidateId === filter.candidateId && doc.externalJobId === filter.externalJobId;
}

function applyUpdate(target: Doc, update: Doc, isInsert: boolean): void {
  const set = (update.$set as Doc) ?? {};
  for (const [k, v] of toPairs(set)) target[k] = v;
  if (isInsert) {
    const onInsert = (update.$setOnInsert as Doc) ?? {};
    for (const [k, v] of toPairs(onInsert)) target[k] = v;
  }
}

// Minimal Mongoose-schema shape consumed by MongoCrudRepository.toDomain
// (dateFields / relationRefs / _id type). createdAt+updatedAt are the only Date
// paths; the candidate/externalJob virtuals carry no ref we need to follow here.
const fakeSchema = {
  paths: {
    _id: { instance: "Number" },
    createdAt: { instance: "Date", options: {} },
    updatedAt: { instance: "Date", options: {} },
  },
  virtuals: {},
  path(name: string) {
    return (fakeSchema.paths as Record<string, { instance: string }>)[name] ?? null;
  },
};

class FakeMatchModel {
  rows: Doc[] = [];
  private chain = Promise.resolve();
  collection = { collectionName: "cv_assistant_candidate_job_matches" };
  schema = fakeSchema;
  db = {
    db: {
      collection: () => this.counters,
    },
    models: {} as Record<string, unknown>,
  };

  private counterValue = 0;
  private counters = {
    findOneAndUpdate: async (_filter: Doc, _update: Doc, _opts: Doc) => {
      this.counterValue += 1;
      return { _id: "cv_assistant_candidate_job_matches", seq: this.counterValue };
    },
    updateOne: async () => undefined,
  };

  findOne(filter?: Doc) {
    const rows = this.rows;
    return {
      sort() {
        return this;
      },
      lean() {
        return this;
      },
      async exec() {
        if (!filter) return rows.length > 0 ? { ...rows[rows.length - 1] } : null;
        const hit = rows.find((r) => sameKey(r, filter));
        return hit ? { ...hit } : null;
      },
    };
  }

  // Mongo guarantees the unique index serialises concurrent upserts on the key.
  // We replicate that by chaining each upsert so two parallel calls can never
  // both observe "no existing row" and both insert.
  findOneAndUpdate(filter: Doc, update: Doc, _opts: Doc) {
    const run = this.chain.then(async () => {
      const existing = this.rows.find((r) => sameKey(r, filter));
      if (existing) {
        applyUpdate(existing, update, false);
        return { ...existing };
      }
      const created: Doc = { candidateId: filter.candidateId, externalJobId: filter.externalJobId };
      applyUpdate(created, update, true);
      this.rows.push(created);
      return { ...created };
    });
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return {
      lean() {
        return this;
      },
      exec: () => run,
    };
  }
}

function scores(overall: number): MatchScores {
  return {
    similarityScore: overall,
    structuredScore: overall,
    overallScore: overall,
    matchDetails: {
      embeddingSimilarity: overall,
      skillsOverlap: 0,
      skillsMatched: [],
      skillsMissing: [],
      experienceMatch: 0,
      locationMatch: 0,
      reasoning: `score-${overall}`,
    },
  };
}

describe("MongoCandidateJobMatchRepository — concurrent upsert idempotency (H-3)", () => {
  it("two parallel upserts for the same (candidateId, externalJobId) leave exactly one row", async () => {
    const model = new FakeMatchModel();
    const repo = new MongoCandidateJobMatchRepository(model as never);

    await expect(
      Promise.all([
        repo.upsertScoredMatch(100, 5, scores(0.4)),
        repo.upsertScoredMatch(100, 5, scores(0.9)),
      ]),
    ).resolves.toHaveLength(2);

    const matched = model.rows.filter((r) => r.candidateId === 100 && r.externalJobId === 5);
    expect(matched).toHaveLength(1);
  });

  it("never throws a duplicate-key (E11000) error under the race", async () => {
    const model = new FakeMatchModel();
    const repo = new MongoCandidateJobMatchRepository(model as never);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) => repo.upsertScoredMatch(7, 7, scores(0.1 * i))),
    );
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(model.rows.filter((r) => r.candidateId === 7 && r.externalJobId === 7)).toHaveLength(1);
  });

  it("the surviving row reflects the last write (last-write-wins on scores)", async () => {
    const model = new FakeMatchModel();
    const repo = new MongoCandidateJobMatchRepository(model as never);

    await repo.upsertScoredMatch(100, 5, scores(0.4));
    await repo.upsertScoredMatch(100, 5, scores(0.9));

    const row = model.rows.find((r) => r.candidateId === 100 && r.externalJobId === 5);
    expect(row?.overallScore).toBe(0.9);
    expect((row?.matchDetails as { reasoning: string }).reasoning).toBe("score-0.9");
  });

  it("distinct pairs each get their own row", async () => {
    const model = new FakeMatchModel();
    const repo = new MongoCandidateJobMatchRepository(model as never);

    await Promise.all([
      repo.upsertScoredMatch(1, 1, scores(0.5)),
      repo.upsertScoredMatch(1, 2, scores(0.5)),
      repo.upsertScoredMatch(2, 1, scores(0.5)),
    ]);

    expect(model.rows).toHaveLength(3);
  });
});
