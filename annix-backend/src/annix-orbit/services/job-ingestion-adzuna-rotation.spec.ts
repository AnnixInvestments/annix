import { selectAdzunaCategoriesForDay } from "./job-ingestion.service";

const DAY_MS = 86_400_000;

// A representative 29-category list (same size as ADZUNA_ZA_CATEGORIES).
const CATEGORIES = Array.from({ length: 29 }, (_, i) => `cat-${i}`);

function cycle(categories: string[], perDay: number): string[][] {
  const dayCount = Math.ceil(categories.length / perDay);
  return Array.from({ length: dayCount }, (_, day) =>
    selectAdzunaCategoriesForDay(categories, perDay, day * DAY_MS),
  );
}

describe("selectAdzunaCategoriesForDay", () => {
  it("covers every category exactly once per cycle (no category ever dropped)", () => {
    const days = cycle(CATEGORIES, 15);
    const seen = days.flat();
    expect(new Set(seen).size).toBe(CATEGORIES.length);
    expect(seen.length).toBe(CATEGORIES.length); // no duplicates across the cycle
  });

  it("balances the daily groups to within one (no lumpy tiny final day)", () => {
    const sizes = cycle(CATEGORIES, 15).map((day) => day.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    // 29 over 2 days → 15 + 14.
    expect(sizes.sort((a, b) => b - a)).toEqual([15, 14]);
  });

  it("balances and covers for a 3-day cycle too", () => {
    const days = cycle(CATEGORIES, 10); // ceil(29/10) = 3 days
    expect(days).toHaveLength(3);
    const sizes = days.map((d) => d.length).sort((a, b) => b - a);
    expect(sizes).toEqual([10, 10, 9]);
    expect(new Set(days.flat()).size).toBe(29);
  });

  it("returns the full list when perDay >= total (rotation disabled)", () => {
    expect(selectAdzunaCategoriesForDay(CATEGORIES, 29, 0)).toEqual(CATEGORIES);
    expect(selectAdzunaCategoriesForDay(CATEGORIES, 100, 5 * DAY_MS)).toEqual(CATEGORIES);
  });

  it("falls back to the full list on a non-positive perDay (safety)", () => {
    expect(selectAdzunaCategoriesForDay(CATEGORIES, 0, 0)).toEqual(CATEGORIES);
    expect(selectAdzunaCategoriesForDay(CATEGORIES, -3, 0)).toEqual(CATEGORIES);
  });

  it("advances to a different group the next day", () => {
    const today = selectAdzunaCategoriesForDay(CATEGORIES, 15, 0);
    const tomorrow = selectAdzunaCategoriesForDay(CATEGORIES, 15, DAY_MS);
    expect(today).not.toEqual(tomorrow);
    // …and wraps back after the full cycle.
    expect(selectAdzunaCategoriesForDay(CATEGORIES, 15, 2 * DAY_MS)).toEqual(today);
  });
});
