import {
  DEFAULT_MATCH_TIER,
  expandWithAdjacentCategories,
  isJobCategoryKey,
  isMatchTier,
  type JobCategoryKey,
} from "@annix/product-data/sa-market";
import type { mongo } from "mongoose";

// Perf #396 finding 2: narrow the job→candidate match scan from "cosine every
// candidate embedding" to an indexed `$in` on precomputed matchKeys. This
// migration (1) backfills matchKeys for every existing candidate using the SAME
// key logic the write-path uses, then (2) creates the compound index the narrowed
// scan relies on. Backfill BEFORE the narrowed query path serves traffic so no
// candidate is left unindexed (a candidate without matchKeys would silently
// never match any job). autoIndex is off on the Orbit cluster, so the index must
// be created explicitly here.
//
// The key logic is inlined (snapshotted) here rather than imported from
// `src/annix-orbit/lib/match-keys` — the deploy image ships compiled `dist/`, not
// `src/`, so a migration that imports app source fails to load at release_command
// time. Migrations must be self-contained; they only depend on the published
// `@annix/product-data` package (present in node_modules). Mirrors
// `candidateMatchKeys` exactly, via the same product-data tier/adjacency helpers.
const COLLECTION = "cv_assistant_candidates";
const INDEX = "idx_cv_assistant_candidates_matchkeys";
const BATCH = 500;
const DEFAULT_TARGET_COUNTRIES = ["za"];
const WILDCARD = "*";

function keyFor(category: string, country: string): string {
  return `${category}|${country}`;
}

function normalisedCountries(countries: string[] | null | undefined): string[] {
  const raw = countries && countries.length > 0 ? countries : DEFAULT_TARGET_COUNTRIES;
  return raw.map((country) => country.toLowerCase());
}

function categoryPool(
  matchTier: string | null | undefined,
  targetCategories: string[] | null | undefined,
): JobCategoryKey[] | null {
  const tier = isMatchTier(matchTier) ? matchTier : DEFAULT_MATCH_TIER;
  const targets = (targetCategories ?? []).filter((key): key is JobCategoryKey =>
    isJobCategoryKey(key),
  );
  if (targets.length === 0) {
    return null;
  }
  if (tier === "hard") {
    return targets;
  }
  if (tier === "medium") {
    return expandWithAdjacentCategories(targets) as JobCategoryKey[];
  }
  return null;
}

function candidateMatchKeys(
  matchTier: string | null | undefined,
  targetCategories: string[] | null | undefined,
  targetCountries: string[] | null | undefined,
): string[] {
  const countries = normalisedCountries(targetCountries);
  const pool = categoryPool(matchTier, targetCategories);

  const keys = new Set<string>();
  if (pool === null) {
    for (const country of countries) {
      keys.add(keyFor(WILDCARD, country));
    }
    return [...keys];
  }
  for (const country of countries) {
    for (const category of pool) {
      keys.add(keyFor(category, country));
    }
  }
  return [...keys];
}

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
