import type { mongo } from "mongoose";
import { candidateMatchKeys } from "../src/annix-orbit/lib/match-keys";

// Perf #396 finding 2: narrow the job→candidate match scan from "cosine every
// candidate embedding" to an indexed `$in` on precomputed matchKeys. This
// migration (1) backfills matchKeys for every existing candidate using the SAME
// helper the write-path uses, then (2) creates the compound index the narrowed
// scan relies on. Backfill BEFORE the narrowed query path serves traffic so no
// candidate is left unindexed (a candidate without matchKeys would silently
// never match any job). autoIndex is off on the Orbit cluster, so the index must
// be created explicitly here.
const COLLECTION = "cv_assistant_candidates";
const INDEX = "idx_cv_assistant_candidates_matchkeys";
const BATCH = 500;

export async function up(db: mongo.Db): Promise<void> {
  const candidates = db.collection(COLLECTION);
  const cursor = candidates.find(
    {},
    { projection: { matchTier: 1, targetCategories: 1, targetCountries: 1 } },
  );

  let ops: mongo.AnyBulkWriteOperation[] = [];
  for await (const candidate of cursor) {
    const keys = candidateMatchKeys(
      typeof candidate.matchTier === "string" ? candidate.matchTier : null,
      Array.isArray(candidate.targetCategories) ? candidate.targetCategories : null,
      Array.isArray(candidate.targetCountries) ? candidate.targetCountries : null,
    );
    ops.push({
      updateOne: { filter: { _id: candidate._id }, update: { $set: { matchKeys: keys } } },
    });
    if (ops.length >= BATCH) {
      await candidates.bulkWrite(ops);
      ops = [];
    }
  }
  if (ops.length > 0) {
    await candidates.bulkWrite(ops);
  }

  // Index matchKeys ALONE — not a compound with embedding. matchKeys is a
  // multikey array, so a { matchKeys, embedding } compound would store the ~3KB
  // embedding Buffer once PER array element per candidate → severe index bloat on
  // the M0 512MB cap. The `$in` is served by this small string index; the cursor
  // then fetches each matched candidate's embedding by _id, exactly as the old
  // full scan streamed it.
  await candidates.createIndex({ matchKeys: 1 }, { name: INDEX });
}

export async function down(db: mongo.Db): Promise<void> {
  await db
    .collection(COLLECTION)
    .dropIndex(INDEX)
    .catch(() => undefined);
  // Forward-only on the data: the backfilled matchKeys field is harmless derived
  // state and is kept (re-deriving on every write regardless).
}
