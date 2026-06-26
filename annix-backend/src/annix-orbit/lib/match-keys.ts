import {
  DEFAULT_MATCH_TIER,
  expandWithAdjacentCategories,
  isJobCategoryKey,
  isMatchTier,
  type JobCategoryKey,
} from "@annix/product-data/sa-market";

// Perf #396 finding 2: the job→candidate match scan used to brute-force-cosine
// every new job against EVERY candidate embedding. To narrow it to an indexable
// query we precompute, per candidate, the set of "<category>|<country>" keys it
// would consider — mirroring the matcher's resolveCategoryNarrowing tier logic
// (and buildActiveDemand in embedding.service.ts) EXACTLY. A job then finds its
// candidates with `{ matchKeys: { $in: jobMatchKeyQuery(cat, country) } }`.
//
// The wildcard key "*|<country>" is the load-bearing piece: soft/uncategorised
// seekers take any category, and a `{targetCategories: {$size: 0}}` filter can't
// be served by an index (→ COLLSCAN). The sentinel makes that branch a pure
// index equality. This file is the SINGLE source of truth for the key format —
// the candidate write-path, the job-side query, and the backfill migration all
// call it, so the two directions can never drift (drift = matches silently
// vanish).

// Seekers default to South African jobs unless they opt into others. Mirrors
// targetCountriesOf in candidate-job-matching.service.ts (kept inline to avoid a
// service→lib import cycle; the default is intentionally identical).
const DEFAULT_TARGET_COUNTRIES = ["za"];

const WILDCARD = "*";

function keyFor(category: string, country: string): string {
  return `${category}|${country}`;
}

function normalisedCountries(countries: string[] | null | undefined): string[] {
  const raw = countries && countries.length > 0 ? countries : DEFAULT_TARGET_COUNTRIES;
  return raw.map((country) => country.toLowerCase());
}

// The category pool a candidate considers, in the matcher's tier granularity:
//   hard   → exact target categories
//   medium → targets + adjacent categories
//   soft / uncategorised → null (any category)
// Identical to resolveCategoryNarrowing(...).pool and buildActiveDemand's pool.
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

// The indexable equality keys describing every (category, country) a candidate
// would consider. Stored on the candidate as `matchKeys` and kept in sync on
// every write to matchTier / targetCategories / targetCountries.
export function candidateMatchKeys(
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

// The keys a job looks up against candidate.matchKeys: its own category+country
// plus the country wildcard (to reach soft/uncategorised seekers). A job with no
// category can only reach wildcard candidates — mirrors demandCovers().
export function jobMatchKeyQuery(
  canonicalCategory: string | null | undefined,
  country: string | null | undefined,
): string[] {
  const normalisedCountry = (country ?? "").toLowerCase();
  if (normalisedCountry === "") {
    return [];
  }
  const keys = [keyFor(WILDCARD, normalisedCountry)];
  if (canonicalCategory) {
    keys.unshift(keyFor(canonicalCategory, normalisedCountry));
  }
  return keys;
}
