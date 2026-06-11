// Pure, in-memory filtering over a candidate's match rows. The rows are fetched
// once per request cycle (and cached) and every facet + the headline count are
// derived from them here — no per-filter database round-trip. Kept dependency-free
// so it is cheap to unit-test.

export interface FacetRow {
  country: string | null;
  canonicalProvince: string | null;
  canonicalCity: string | null;
  canonicalCategory: string | null;
  sourceId: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  title: string | null;
  company: string | null;
  locationArea: string | null;
  locationRaw: string | null;
}

export interface FacetFilter {
  // Hard country gate (the seeker's target countries) — always applied, never a
  // facet dimension you can switch off.
  targetCountries?: string[] | null;
  // Optional single-country narrowing from the Region dropdown.
  region?: string | null;
  // Multi-select dimensions: an empty/absent array means "no filter"; otherwise
  // the row must match ANY of the selected values.
  provinces?: string[] | null;
  cities?: string[] | null;
  category?: string | null;
  sourceIds?: number[] | null;
  minSalary?: number | null;
  search?: string | null;
}

export type FacetDim = "region" | "province" | "city" | "category" | "source" | "salary" | "search";

const NO_SKIP: ReadonlySet<FacetDim> = new Set();

function keywordOf(row: FacetRow): string {
  return `${row.title ?? ""} ${row.company ?? ""} ${row.locationArea ?? ""} ${row.locationRaw ?? ""}`.toLowerCase();
}

function bestSalary(row: FacetRow): number | null {
  return row.salaryMax != null ? row.salaryMax : row.salaryMin;
}

// Does a row satisfy the active filters? `skip` omits a dimension so a facet can
// be computed with every OTHER filter applied but not its own.
export function rowPasses(
  row: FacetRow,
  filter: FacetFilter,
  skip: ReadonlySet<FacetDim> = NO_SKIP,
): boolean {
  if (
    filter.targetCountries &&
    filter.targetCountries.length > 0 &&
    !filter.targetCountries.includes(row.country ?? "")
  ) {
    return false;
  }
  if (!skip.has("region") && filter.region && row.country !== filter.region) {
    return false;
  }
  if (
    !skip.has("province") &&
    filter.provinces &&
    filter.provinces.length > 0 &&
    !filter.provinces.includes(row.canonicalProvince ?? "")
  ) {
    return false;
  }
  if (
    !skip.has("city") &&
    filter.cities &&
    filter.cities.length > 0 &&
    !filter.cities.includes(row.canonicalCity ?? "")
  ) {
    return false;
  }
  if (!skip.has("category") && filter.category && row.canonicalCategory !== filter.category) {
    return false;
  }
  if (
    !skip.has("source") &&
    filter.sourceIds &&
    filter.sourceIds.length > 0 &&
    !filter.sourceIds.includes(row.sourceId ?? -1)
  ) {
    return false;
  }
  if (!skip.has("salary") && filter.minSalary != null && filter.minSalary > 0) {
    const best = bestSalary(row);
    if (best != null && best < filter.minSalary) {
      return false;
    }
  }
  if (!skip.has("search") && filter.search) {
    const term = filter.search.trim().toLowerCase();
    if (term.length > 0 && !keywordOf(row).includes(term)) {
      return false;
    }
  }
  return true;
}

export function countMatchingRows(rows: FacetRow[], filter: FacetFilter): number {
  let total = 0;
  for (const row of rows) {
    if (rowPasses(row, filter)) total += 1;
  }
  return total;
}

// Distinct non-null values of `selector` across rows that pass every filter except
// the skipped dimension(s).
export function distinctPassing<T>(
  rows: FacetRow[],
  filter: FacetFilter,
  skip: ReadonlySet<FacetDim>,
  selector: (row: FacetRow) => T | null | undefined,
): Set<T> {
  const out = new Set<T>();
  for (const row of rows) {
    if (!rowPasses(row, filter, skip)) continue;
    const value = selector(row);
    if (value != null && value !== "") out.add(value);
  }
  return out;
}
