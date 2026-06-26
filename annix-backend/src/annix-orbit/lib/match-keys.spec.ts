import { candidateMatchKeys, jobMatchKeyQuery } from "./match-keys";

// A candidate matches a job iff the job's query keys intersect the candidate's
// stored matchKeys — the invariant the whole narrowing rests on.
function intersects(jobKeys: string[], candidateKeys: string[]): boolean {
  const set = new Set(candidateKeys);
  return jobKeys.some((key) => set.has(key));
}

describe("candidateMatchKeys", () => {
  it("uncategorised seeker → country wildcard only (default za)", () => {
    expect(candidateMatchKeys("soft", [], null)).toEqual(["*|za"]);
    expect(candidateMatchKeys(null, null, null)).toEqual(["*|za"]);
  });

  it("uncategorised seeker honours explicit countries (no za leak)", () => {
    expect(candidateMatchKeys("soft", [], ["gb"])).toEqual(["*|gb"]);
  });

  it("soft tier WITH targets is still a wildcard (pool is null for soft)", () => {
    // Mirrors resolveCategoryNarrowing: soft → pool null regardless of targets.
    expect(candidateMatchKeys("soft", ["it-software"], null)).toEqual(["*|za"]);
  });

  it("hard tier → exact target keys only", () => {
    expect(candidateMatchKeys("hard", ["it-software"], ["za"])).toEqual(["it-software|za"]);
  });

  it("medium tier → targets plus adjacent categories", () => {
    const keys = candidateMatchKeys("medium", ["it-software"], ["za"]);
    expect(keys).toContain("it-software|za");
    // it-software clusters with engineering-technical + media-creative.
    expect(keys).toContain("engineering-technical|za");
    expect(keys).toContain("media-creative|za");
    expect(keys.every((k) => k.endsWith("|za"))).toBe(true);
  });

  it("lowercases countries and crosses category × country", () => {
    const keys = candidateMatchKeys("hard", ["it-software", "finance-accounting"], ["ZA", "GB"]);
    expect(new Set(keys)).toEqual(
      new Set([
        "it-software|za",
        "finance-accounting|za",
        "it-software|gb",
        "finance-accounting|gb",
      ]),
    );
  });

  it("drops unknown category keys", () => {
    expect(candidateMatchKeys("hard", ["not-a-real-category"], ["za"])).toEqual(["*|za"]);
  });
});

describe("jobMatchKeyQuery", () => {
  it("categorised job → its own key plus the country wildcard", () => {
    expect(jobMatchKeyQuery("it-software", "za")).toEqual(["it-software|za", "*|za"]);
  });

  it("uncategorised job → wildcard only (reaches soft seekers only)", () => {
    expect(jobMatchKeyQuery(null, "za")).toEqual(["*|za"]);
  });

  it("job with no country → no keys (cannot be targeted)", () => {
    expect(jobMatchKeyQuery("it-software", null)).toEqual([]);
    expect(jobMatchKeyQuery("it-software", "")).toEqual([]);
  });

  it("lowercases the job country", () => {
    expect(jobMatchKeyQuery("it-software", "ZA")).toEqual(["it-software|za", "*|za"]);
  });
});

describe("round-trip invariant (candidate ↔ job)", () => {
  const itJob = jobMatchKeyQuery("it-software", "za");
  const financeJob = jobMatchKeyQuery("finance-accounting", "za");
  const gbItJob = jobMatchKeyQuery("it-software", "gb");

  it("hard seeker matches only their exact category", () => {
    const hardIt = candidateMatchKeys("hard", ["it-software"], ["za"]);
    expect(intersects(itJob, hardIt)).toBe(true);
    expect(intersects(financeJob, hardIt)).toBe(false);
  });

  it("medium seeker matches adjacent categories too", () => {
    const medIt = candidateMatchKeys("medium", ["it-software"], ["za"]);
    const engJob = jobMatchKeyQuery("engineering-technical", "za");
    expect(intersects(engJob, medIt)).toBe(true);
  });

  it("uncategorised seeker matches any in-country job", () => {
    const wildcard = candidateMatchKeys("soft", [], ["za"]);
    expect(intersects(itJob, wildcard)).toBe(true);
    expect(intersects(financeJob, wildcard)).toBe(true);
    // …but not jobs in a country they didn't opt into.
    expect(intersects(gbItJob, wildcard)).toBe(false);
  });
});
