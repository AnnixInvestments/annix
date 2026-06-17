import {
  expandWithAdjacentCategories,
  JOB_CATEGORY_KEYS,
  type JobCategoryKey,
  MATCH_TIERS,
  type MatchTier,
  type SharedWorkFields,
  type WorkProfile,
} from "@annix/product-data/sa-market";
import { Candidate, type ExtractedCvData } from "../entities/candidate.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateJobMatchRepository } from "../repositories/candidate-job-match.repository";
import { ExternalJobRepository } from "../repositories/external-job.repository";
import { OrbitTierCapabilityRepository } from "../repositories/orbit-tier-capability.repository";
import {
  CandidateJobMatchingService,
  DEFAULT_WEIGHTS,
  inferJobSeniority,
  WEIGHT_PROFILES,
  weightProfile,
} from "./candidate-job-matching.service";
import { CvNotificationService } from "./cv-notification.service";
import { haversineKm } from "./geocode.service";

// Deterministic-scoring matrix suite. Exercises the real (pure, non-embedding)
// scoring functions of the matcher across thousands of generated combinations of
// experience/age, skills/qualifications, city location/distance, sought role/field
// and category tier — to verify the matching behaves correctly and stays correct.
// The embedding-cosine half of the score is not exercised here (it is mocked away
// by calling the structured scorers directly).

// The service's structured scorers never touch the repositories, so it is built
// once with empty deps and reused across every case (fast — no per-test wiring).
const service = new CandidateJobMatchingService(
  {} as CandidateJobMatchRepository,
  {} as CandidateRepository,
  {} as ExternalJobRepository,
  {} as OrbitTierCapabilityRepository,
  {} as CvNotificationService,
);

// Typed window onto the deterministic private scorers we assert against.
interface ScoringInternals {
  calculateExperienceMatch(candidate: Candidate, job: ExternalJob): number;
  calculateLocationMatch(candidate: Candidate, job: ExternalJob): number;
  calculateSkillsOverlap(
    candidate: Candidate,
    job: ExternalJob,
  ): { score: number; matched: string[]; missing: string[] };
  categoryBoostFor(
    job: ExternalJob,
    narrowing: ReturnType<CandidateJobMatchingService["resolveCategoryNarrowing"]>,
  ): number;
  calculateSalaryMatch(
    candidate: Candidate,
    job: ExternalJob,
  ): { score: number; note: string | null };
}
const internal = service as unknown as ScoringInternals;

function cv(over: Partial<ExtractedCvData>): ExtractedCvData {
  return {
    candidateName: null,
    email: null,
    phone: null,
    experienceYears: null,
    skills: [],
    education: [],
    certifications: [],
    references: [],
    summary: null,
    detectedLanguage: null,
    professionalRegistrations: [],
    saQualifications: [],
    location: null,
    ...over,
  };
}

function workProfile(over: Partial<SharedWorkFields>): WorkProfile {
  return {
    shared: {
      fields: [],
      primaryRole: null,
      yearsExperience: null,
      availability: null,
      willingToTravelKm: null,
      topSkills: [],
      certifications: [],
      ...over,
    },
  };
}

function candidate(over: Partial<Candidate>): Candidate {
  return {
    id: 1,
    matchTier: "soft",
    extractedData: null,
    locationLat: null,
    locationLon: null,
    workProfile: null,
    targetCategories: null,
    embedding: null,
    ...over,
  } as unknown as Candidate;
}

function job(over: Partial<ExternalJob>): ExternalJob {
  return {
    id: 1,
    title: "",
    company: null,
    country: "za",
    locationRaw: null,
    locationArea: null,
    locationLat: null,
    locationLon: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    description: null,
    extractedSkills: [],
    category: null,
    canonicalCategory: null,
    embedding: null,
    postedAt: null,
    ...over,
  } as unknown as ExternalJob;
}

// ---------------------------------------------------------------------------
// 1. Experience / age → seniority band
// ---------------------------------------------------------------------------

function expectedExperience(years: number | null): number {
  if (!years) return 0.5; // 0 and null/missing are both treated as "unknown" (neutral)
  if (years >= 5) return 1.0;
  if (years >= 3) return 0.8;
  if (years >= 1) return 0.5;
  return 0.2;
}

const yearsList = Array.from({ length: 61 }, (_, i) => Number((i * 0.5).toFixed(1))); // 0 → 30
const ageList = Array.from({ length: 48 }, (_, i) => i + 18); // 18 → 65

const experienceCases = [
  ...yearsList.map((years) => ({
    label: `years=${years}`,
    years,
    expected: expectedExperience(years),
  })),
  ...ageList.map((age) => {
    const years = Math.max(0, age - 22);
    return { label: `age=${age} (≈${years}y)`, years, expected: expectedExperience(years) };
  }),
  { label: "no years (null)", years: null, expected: 0.5 },
];

describe("matching matrix — experience / age band", () => {
  it.each(experienceCases)("$label → $expected", ({ years, expected }) => {
    const c = candidate({ extractedData: years === null ? null : cv({ experienceYears: years }) });
    expect(internal.calculateExperienceMatch(c, job({}))).toBeCloseTo(expected, 6);
  });

  it("a missing CV (null extractedData) scores as 'unknown' (0.5)", () => {
    expect(
      internal.calculateExperienceMatch(candidate({ extractedData: null }), job({})),
    ).toBeCloseTo(0.5, 6);
  });

  it("treats 0 / missing years as 'unknown' (0.5), not as zero-experience (0.2)", () => {
    expect(
      internal.calculateExperienceMatch(
        candidate({ extractedData: cv({ experienceYears: 0 }) }),
        job({}),
      ),
    ).toBeCloseTo(0.5, 6);
    expect(
      internal.calculateExperienceMatch(
        candidate({ extractedData: cv({ experienceYears: 0.5 }) }),
        job({}),
      ),
    ).toBeCloseTo(0.2, 6);
  });

  it("experience score is non-decreasing as real experience grows (years ≥ 0.5)", () => {
    const xs = yearsList.filter((y) => y >= 0.5);
    const scores = xs.map((y) =>
      internal.calculateExperienceMatch(
        candidate({ extractedData: cv({ experienceYears: y }) }),
        job({}),
      ),
    );
    scores.forEach((s, i) => {
      if (i > 0) expect(s).toBeGreaterThanOrEqual(scores[i - 1]);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Skills / qualifications overlap
// ---------------------------------------------------------------------------

const SKILL_POOL = [
  "javascript",
  "typescript",
  "react",
  "node",
  "python",
  "sql",
  "excel",
  "welding",
  "accounting",
  "nursing",
  "driving",
  "sales",
  "marketing",
  "plumbing",
  "electrical",
  "carpentry",
  "payroll",
  "logistics",
  "security",
  "teaching",
];

function expectedSkills(candSkills: string[], jobSkills: string[]): number {
  const cs = candSkills.map((s) => s.toLowerCase());
  const js = jobSkills.map((s) => s.toLowerCase());
  if (js.length === 0) return cs.length > 0 ? 0.5 : 0;
  const matched = js.filter((j) => cs.some((c) => c.includes(j) || j.includes(c)));
  return matched.length / js.length;
}

const skillCases = Array.from({ length: 20 }, (_, ci) =>
  Array.from({ length: 20 }, (_, ji) => {
    const candSkills = SKILL_POOL.slice(0, ci + 1);
    const jobSkills = SKILL_POOL.slice(ji, ji + 5);
    return { ci, ji, candSkills, jobSkills, expected: expectedSkills(candSkills, jobSkills) };
  }),
).flat();

describe("matching matrix — skills / qualifications overlap", () => {
  it.each(skillCases)("candidate[0..$ci] vs job[$ji..] → $expected", ({
    candSkills,
    jobSkills,
    expected,
  }) => {
    const c = candidate({ extractedData: cv({ skills: candSkills }) });
    const j = job({ extractedSkills: jobSkills });
    expect(internal.calculateSkillsOverlap(c, j).score).toBeCloseTo(expected, 6);
  });

  it("a job with no listed skills scores 0.5 for a candidate with skills, 0 without", () => {
    expect(
      internal.calculateSkillsOverlap(
        candidate({ extractedData: cv({ skills: ["python"] }) }),
        job({ extractedSkills: [] }),
      ).score,
    ).toBeCloseTo(0.5, 6);
    expect(
      internal.calculateSkillsOverlap(
        candidate({ extractedData: cv({ skills: [] }) }),
        job({ extractedSkills: [] }),
      ).score,
    ).toBeCloseTo(0, 6);
  });

  it("full overlap scores 1.0 and disjoint scores 0", () => {
    expect(
      internal.calculateSkillsOverlap(
        candidate({ extractedData: cv({ skills: ["welding", "fabrication"] }) }),
        job({ extractedSkills: ["welding"] }),
      ).score,
    ).toBeCloseTo(1, 6);
    expect(
      internal.calculateSkillsOverlap(
        candidate({ extractedData: cv({ skills: ["accounting"] }) }),
        job({ extractedSkills: ["welding"] }),
      ).score,
    ).toBeCloseTo(0, 6);
  });
});

// ---------------------------------------------------------------------------
// 3. City location / distance
// ---------------------------------------------------------------------------

const SA_CITIES = [
  { city: "Johannesburg", lat: -26.2041, lon: 28.0473 },
  { city: "Sandton", lat: -26.1076, lon: 28.0567 },
  { city: "Pretoria", lat: -25.7479, lon: 28.2293 },
  { city: "Centurion", lat: -25.8603, lon: 28.1894 },
  { city: "Cape Town", lat: -33.9249, lon: 18.4241 },
  { city: "Stellenbosch", lat: -33.9321, lon: 18.8602 },
  { city: "Durban", lat: -29.8587, lon: 31.0218 },
  { city: "Pietermaritzburg", lat: -29.6006, lon: 30.3794 },
  { city: "Gqeberha", lat: -33.9608, lon: 25.6022 },
  { city: "East London", lat: -33.0153, lon: 27.9116 },
  { city: "Bloemfontein", lat: -29.0852, lon: 26.1596 },
  { city: "Polokwane", lat: -23.9045, lon: 29.4689 },
  { city: "Mbombela", lat: -25.4753, lon: 30.9694 },
  { city: "Kimberley", lat: -28.7282, lon: 24.7499 },
  { city: "Rustenburg", lat: -25.6672, lon: 27.2424 },
  { city: "George", lat: -33.9628, lon: 22.4619 },
  { city: "Welkom", lat: -27.9836, lon: 26.7355 },
  { city: "Newcastle", lat: -27.7574, lon: 29.9318 },
];

function locationBand(km: number): number {
  if (km < 25) return 1.0;
  if (km < 50) return 0.85;
  if (km < 150) return 0.6;
  if (km < 400) return 0.35;
  return 0.15;
}

const locationCases = SA_CITIES.flatMap((from) =>
  SA_CITIES.map((to) => {
    const km = haversineKm({ lat: from.lat, lon: from.lon }, { lat: to.lat, lon: to.lon });
    return { from: from.city, to: to.city, km, expected: locationBand(km) };
  }),
);

describe("matching matrix — city location / distance", () => {
  it.each(locationCases)("$from → $to (~$km km) scores $expected", ({ from, to, expected }) => {
    const f = SA_CITIES.find((c) => c.city === from);
    const t = SA_CITIES.find((c) => c.city === to);
    if (!f || !t) throw new Error("fixture city missing");
    const c = candidate({ locationLat: f.lat, locationLon: f.lon });
    const j = job({ locationLat: t.lat, locationLon: t.lon, locationArea: t.city });
    expect(internal.calculateLocationMatch(c, j)).toBeCloseTo(expected, 6);
  });

  it("same city always scores 1.0 (distance ≈ 0)", () => {
    SA_CITIES.forEach((cc) => {
      const c = candidate({ locationLat: cc.lat, locationLon: cc.lon });
      const j = job({ locationLat: cc.lat, locationLon: cc.lon });
      expect(internal.calculateLocationMatch(c, j)).toBeCloseTo(1.0, 6);
    });
  });

  it("distance is null (and falls back) when either side lacks coordinates", () => {
    expect(
      service.calculateDistance(
        candidate({ locationLat: null, locationLon: 28 }),
        job({ locationLat: -26, locationLon: 28 }),
      ),
    ).toBeNull();
    expect(
      service.calculateDistance(
        candidate({ locationLat: -26, locationLon: 28 }),
        job({ locationLat: null, locationLon: 28 }),
      ),
    ).toBeNull();
  });

  it("falls back sensibly with no coordinates: exact area in summary > both-in-SA > neither > no-area", () => {
    const noCoords = (over: Partial<Candidate>) =>
      candidate({ locationLat: null, locationLon: null, ...over });
    // job area named in the candidate's CV summary → 1.0
    expect(
      internal.calculateLocationMatch(
        noCoords({ extractedData: cv({ summary: "Based in Cape Town, available immediately" }) }),
        job({ locationArea: "Cape Town" }),
      ),
    ).toBeCloseTo(1.0, 6);
    // both in known SA regions but not the same → 0.7
    expect(
      internal.calculateLocationMatch(
        noCoords({ extractedData: cv({ summary: "Johannesburg based candidate" }) }),
        job({ locationArea: "Pretoria, Gauteng" }),
      ),
    ).toBeCloseTo(0.7, 6);
    // neither recognised → 0.3
    expect(
      internal.calculateLocationMatch(
        noCoords({ extractedData: cv({ summary: "Remote worker" }) }),
        job({ locationArea: "Windhoek" }),
      ),
    ).toBeCloseTo(0.3, 6);
    // job has no area at all → neutral 0.5
    expect(
      internal.calculateLocationMatch(
        noCoords({ extractedData: cv({ summary: "" }) }),
        job({ locationArea: null }),
      ),
    ).toBeCloseTo(0.5, 6);
  });

  it("location score is non-increasing as the job gets further from the candidate", () => {
    const jhb = { lat: -26.2041, lon: 28.0473 };
    const ranked = SA_CITIES.map((t) => ({
      city: t,
      km: haversineKm(jhb, { lat: t.lat, lon: t.lon }),
    })).sort((a, b) => a.km - b.km);
    const scores = ranked.map(({ city }) =>
      internal.calculateLocationMatch(
        candidate({ locationLat: jhb.lat, locationLon: jhb.lon }),
        job({ locationLat: city.lat, locationLon: city.lon }),
      ),
    );
    scores.forEach((s, i) => {
      if (i > 0) expect(s).toBeLessThanOrEqual(scores[i - 1]);
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Work profile — field (sought industry) match
// ---------------------------------------------------------------------------

function expectedFieldScore(field: JobCategoryKey, jobCat: JobCategoryKey): number {
  if (field === jobCat) return 1;
  if (expandWithAdjacentCategories([field]).includes(jobCat)) return 0.5;
  return 0;
}

const fieldCases = JOB_CATEGORY_KEYS.flatMap((field) =>
  JOB_CATEGORY_KEYS.map((jobCat) => ({
    field,
    jobCat,
    fieldScore: expectedFieldScore(field, jobCat),
  })),
);

describe("matching matrix — work-profile field (industry) match", () => {
  it.each(fieldCases)("field '$field' vs job category '$jobCat' → field score $fieldScore", ({
    field,
    jobCat,
    fieldScore,
  }) => {
    const c = candidate({ workProfile: workProfile({ fields: [field], primaryRole: null }) });
    const j = job({ canonicalCategory: jobCat, title: "Generic Role", description: "" });
    const res = service.calculateWorkProfileBoost(c, j);
    expect(res.fieldMatched).toBe(fieldScore > 0);
    // No primaryRole → role score 0, so boost == fieldScore * 0.6
    expect(res.score).toBeCloseTo(fieldScore * 0.6, 6);
  });

  it("an exact field always beats an adjacent field, which beats an unrelated field", () => {
    const boostScore = (field: JobCategoryKey, jobCat: JobCategoryKey): number => {
      const s = service.calculateWorkProfileBoost(
        candidate({ workProfile: workProfile({ fields: [field] }) }),
        job({ canonicalCategory: jobCat }),
      ).score;
      if (s === null) throw new Error("expected a numeric work-profile boost score");
      return s;
    };
    JOB_CATEGORY_KEYS.forEach((field) => {
      const exact = boostScore(field, field);
      const adjacentKey = expandWithAdjacentCategories([field]).find((k) => k !== field);
      const unrelatedKey = JOB_CATEGORY_KEYS.find(
        (k) => !expandWithAdjacentCategories([field]).includes(k),
      );
      expect(exact).toBeCloseTo(0.6, 6);
      if (adjacentKey) {
        expect(boostScore(field, adjacentKey)).toBeLessThan(exact);
      }
      if (unrelatedKey) {
        expect(boostScore(field, unrelatedKey)).toBeCloseTo(0, 6);
      }
    });
  });

  it("returns score=null when the candidate has no work profile / no fields", () => {
    expect(
      service.calculateWorkProfileBoost(
        candidate({ workProfile: null }),
        job({ canonicalCategory: "it-software" }),
      ).score,
    ).toBeNull();
    expect(
      service.calculateWorkProfileBoost(
        candidate({ workProfile: workProfile({ fields: [] }) }),
        job({ canonicalCategory: "it-software" }),
      ).score,
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Work profile — sought role title match
// ---------------------------------------------------------------------------

function roleTokens(role: string): string[] {
  return role
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

function roleMatches(role: string, title: string, description: string): boolean {
  const tokens = roleTokens(role);
  if (tokens.length === 0) return false;
  const haystack = `${title}\n${description}`.toLowerCase();
  return tokens.filter((t) => haystack.includes(t)).length >= Math.ceil(tokens.length / 2);
}

const SOUGHT_ROLES = [
  "Software Developer",
  "Project Manager",
  "Registered Nurse",
  "Diesel Mechanic",
  "Financial Accountant",
  "Sales Representative",
  "Electrician",
  "Truck Driver",
  "Civil Engineer",
  "Data Analyst",
  "Head Chef",
  "Security Officer",
  "Mathematics Teacher",
  "Boilermaker Welder",
  "Senior Bookkeeper",
];

const JOB_TITLES = [
  "Senior Software Developer",
  "Junior Project Manager",
  "ICU Registered Nurse",
  "Diesel Mechanic Wanted",
  "Financial Accountant (SAIPA)",
  "Field Sales Representative",
  "Qualified Electrician",
  "Code 14 Truck Driver",
  "Civil Engineering Technologist",
  "Business Data Analyst",
  "Executive Head Chef",
  "Site Security Officer",
  "High School Mathematics Teacher",
  "Boilermaker / Welder",
  "Bookkeeper to Trial Balance",
];

const roleCases = SOUGHT_ROLES.flatMap((role) =>
  JOB_TITLES.map((title) => ({ role, title, matched: roleMatches(role, title, "") })),
);

describe("matching matrix — sought role vs job title", () => {
  it.each(roleCases)("seeking '$role' vs title '$title' → role matched $matched", ({
    role,
    title,
    matched,
  }) => {
    // field always matches (it-software) so we can read the role component cleanly
    const c = candidate({
      workProfile: workProfile({ fields: ["it-software"], primaryRole: role }),
    });
    const j = job({ canonicalCategory: "it-software", title });
    const res = service.calculateWorkProfileBoost(c, j);
    expect(res.roleMatched).toBe(matched);
    // boost == field(1)*0.6 + role(0|1)*0.4
    expect(res.score).toBeCloseTo(0.6 + (matched ? 0.4 : 0), 6);
  });

  it("requires at least half the sought role's words to appear in the job text", () => {
    const c = candidate({
      workProfile: workProfile({
        fields: ["it-software"],
        primaryRole: "Senior Software Developer",
      }),
    });
    expect(
      service.calculateWorkProfileBoost(
        c,
        job({ canonicalCategory: "it-software", title: "Software Developer" }),
      ).roleMatched,
    ).toBe(true);
    expect(
      service.calculateWorkProfileBoost(
        c,
        job({ canonicalCategory: "it-software", title: "Office Cleaner" }),
      ).roleMatched,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Category boost by tier (target / adjacent / unrelated)
// ---------------------------------------------------------------------------

const TIER_CAP: Record<MatchTier, number> = { soft: 0.06, medium: 0.1, hard: 0.12 };

function expectedCategoryBoost(
  tier: MatchTier,
  target: JobCategoryKey,
  jobCat: JobCategoryKey,
): number {
  const cap = TIER_CAP[tier];
  if (jobCat === target) return cap;
  if (expandWithAdjacentCategories([target]).includes(jobCat)) return cap * 0.5;
  return 0;
}

const categoryCases = MATCH_TIERS.flatMap((tier) =>
  JOB_CATEGORY_KEYS.flatMap((target) =>
    JOB_CATEGORY_KEYS.map((jobCat) => ({
      tier,
      target,
      jobCat,
      expected: expectedCategoryBoost(tier, target, jobCat),
    })),
  ),
);

describe("matching matrix — category boost by tier", () => {
  it.each(categoryCases)("tier=$tier target='$target' job='$jobCat' → boost $expected", ({
    tier,
    target,
    jobCat,
    expected,
  }) => {
    const c = candidate({ matchTier: tier, targetCategories: [target] });
    const narrowing = service.resolveCategoryNarrowing(c);
    expect(internal.categoryBoostFor(job({ canonicalCategory: jobCat }), narrowing)).toBeCloseTo(
      expected,
      6,
    );
  });

  it("a candidate with no target categories gets no boost", () => {
    const narrowing = service.resolveCategoryNarrowing(
      candidate({ targetCategories: null, matchTier: "hard" }),
    );
    expect(internal.categoryBoostFor(job({ canonicalCategory: "it-software" }), narrowing)).toBe(0);
  });

  it("higher tiers give an equal or larger exact-match boost (soft ≤ medium ≤ hard)", () => {
    JOB_CATEGORY_KEYS.forEach((cat) => {
      const boost = (tier: MatchTier) => {
        const narrowing = service.resolveCategoryNarrowing(
          candidate({ matchTier: tier, targetCategories: [cat] }),
        );
        return internal.categoryBoostFor(job({ canonicalCategory: cat }), narrowing);
      };
      expect(boost("soft")).toBeLessThanOrEqual(boost("medium"));
      expect(boost("medium")).toBeLessThanOrEqual(boost("hard"));
    });
  });
});

// ---------------------------------------------------------------------------
// 7. Salary fit — Nix-suggested band / user override, "meets-or-beats my floor"
// ---------------------------------------------------------------------------

function expectedSalary(
  floor: number | null,
  jobTop: number | null,
): { score: number; hasNote: boolean } {
  if (floor === null || jobTop === null || jobTop <= 0) return { score: 0.5, hasNote: false };
  if (jobTop >= floor) return { score: 1, hasNote: true };
  return { score: 0.2 + 0.6 * Math.max(0, Math.min(1, jobTop / floor)), hasNote: true };
}

const floorValues = [null, 200000, 400000, 600000];
const jobTopValues = [null, 100000, 300000, 500000, 700000, 1000000];

const salaryCases = floorValues.flatMap((floor) =>
  jobTopValues.flatMap((jobTop) =>
    (["suggested", "override"] as const).map((source) => ({
      source,
      floor,
      jobTop,
      ...expectedSalary(floor, jobTop),
    })),
  ),
);

describe("matching matrix — salary fit (meets-or-beats the candidate's floor)", () => {
  it.each(salaryCases)("floor=$floor ($source) vs job top=$jobTop → score $score", ({
    source,
    floor,
    jobTop,
  }) => {
    const c =
      source === "override"
        ? candidate({ workProfile: workProfile({ expectedSalaryMin: floor }) })
        : candidate({ extractedData: cv({ suggestedSalaryMin: floor }) });
    const expected = expectedSalary(floor, jobTop);
    const res = internal.calculateSalaryMatch(c, job({ salaryMax: jobTop }));
    expect(res.score).toBeCloseTo(expected.score, 6);
    expect(res.note !== null).toBe(expected.hasNote);
  });

  it("the user override takes precedence over Nix's suggested floor", () => {
    const c = candidate({
      extractedData: cv({ suggestedSalaryMin: 250000 }),
      workProfile: workProfile({ expectedSalaryMin: 500000 }),
    });
    // job tops at 300k: beats the 250k suggestion but is below the 500k override
    expect(internal.calculateSalaryMatch(c, job({ salaryMax: 300000 })).score).toBeLessThan(1);
  });

  it("is neutral (0.5, no note) when the candidate or the job has no salary data", () => {
    expect(internal.calculateSalaryMatch(candidate({}), job({ salaryMax: 400000 }))).toEqual({
      score: 0.5,
      note: null,
    });
    expect(
      internal.calculateSalaryMatch(
        candidate({ extractedData: cv({ suggestedSalaryMin: 400000 }) }),
        job({ salaryMin: null, salaryMax: null }),
      ),
    ).toEqual({ score: 0.5, note: null });
  });

  it("higher job pay never lowers the salary score (monotonic, fixed floor)", () => {
    const c = candidate({ extractedData: cv({ suggestedSalaryMin: 400000 }) });
    const tops = [50000, 150000, 300000, 399000, 400000, 600000, 1000000];
    const scores = tops.map((t) => internal.calculateSalaryMatch(c, job({ salaryMax: t })).score);
    scores.forEach((s, i) => {
      if (i > 0) expect(s).toBeGreaterThanOrEqual(scores[i - 1]);
    });
  });

  it("salary scoring is independent of the experience / skills / location dimensions", () => {
    const c = candidate({
      extractedData: cv({ experienceYears: 4, skills: ["python"] }),
      locationLat: -33.9249,
      locationLon: 18.4241,
    });
    const fields = {
      extractedSkills: ["python"],
      locationLat: -33.9321,
      locationLon: 18.8602,
      locationArea: "Cape Town",
    };
    const lowPay = job({ ...fields, salaryMax: 1000 });
    const highPay = job({ ...fields, salaryMax: 5000000 });
    expect(internal.calculateExperienceMatch(c, lowPay)).toBe(
      internal.calculateExperienceMatch(c, highPay),
    );
    expect(internal.calculateSkillsOverlap(c, lowPay).score).toBe(
      internal.calculateSkillsOverlap(c, highPay).score,
    );
    expect(internal.calculateLocationMatch(c, lowPay)).toBe(
      internal.calculateLocationMatch(c, highPay),
    );
  });
});

// ---------------------------------------------------------------------------
// 7b. Seniority-aware experience (candidate seniority vs job seniority)
// ---------------------------------------------------------------------------

const SENIORITIES = ["entry", "junior", "mid", "senior", "lead", "executive"] as const;
const SENIORITY_TITLE: Record<(typeof SENIORITIES)[number], string> = {
  entry: "Entry-level Clerk",
  junior: "Junior Developer",
  mid: "Intermediate Developer",
  senior: "Senior Developer",
  lead: "Lead Developer",
  executive: "Executive Director",
};

function expBand(years: number | null): number {
  if (!years) return 0.5;
  if (years >= 5) return 1.0;
  if (years >= 3) return 0.8;
  if (years >= 1) return 0.5;
  return 0.2;
}

function expectedSeniorityExperience(
  years: number | null,
  candSen: (typeof SENIORITIES)[number],
  jobSen: (typeof SENIORITIES)[number],
): number {
  const base = expBand(years);
  const gap = Math.abs(SENIORITIES.indexOf(candSen) - SENIORITIES.indexOf(jobSen));
  const alignment = gap === 0 ? 1 : gap === 1 ? 0.85 : 0.7;
  return Number((base * alignment).toFixed(6));
}

const yearsSamples = [null, 0, 2, 4, 6];
const seniorityCases = SENIORITIES.flatMap((candSen) =>
  SENIORITIES.flatMap((jobSen) =>
    yearsSamples.map((years) => ({
      candSen,
      jobSen,
      years,
      expected: expectedSeniorityExperience(years, candSen, jobSen),
    })),
  ),
);

describe("matching matrix — seniority-aware experience", () => {
  it.each(seniorityCases)("candidate=$candSen, job=$jobSen, years=$years → $expected", ({
    candSen,
    jobSen,
    years,
    expected,
  }) => {
    const c = candidate({ extractedData: cv({ experienceYears: years, seniority: candSen }) });
    const j = job({ title: SENIORITY_TITLE[jobSen] });
    expect(internal.calculateExperienceMatch(c, j)).toBeCloseTo(expected, 6);
  });

  it("falls back to the plain years band when either seniority is unknown", () => {
    expect(
      internal.calculateExperienceMatch(
        candidate({ extractedData: cv({ experienceYears: 4 }) }),
        job({ title: "Senior Developer" }),
      ),
    ).toBeCloseTo(0.8, 6);
    expect(
      internal.calculateExperienceMatch(
        candidate({ extractedData: cv({ experienceYears: 4, seniority: "senior" }) }),
        job({ title: "Developer" }),
      ),
    ).toBeCloseTo(0.8, 6);
  });

  it("an aligned candidate scores ≥ a 3-level-off candidate for the same role", () => {
    SENIORITIES.forEach((jobSen) => {
      const aligned = internal.calculateExperienceMatch(
        candidate({ extractedData: cv({ experienceYears: 6, seniority: jobSen }) }),
        job({ title: SENIORITY_TITLE[jobSen] }),
      );
      const farIdx = (SENIORITIES.indexOf(jobSen) + 3) % SENIORITIES.length;
      const off = internal.calculateExperienceMatch(
        candidate({ extractedData: cv({ experienceYears: 6, seniority: SENIORITIES[farIdx] }) }),
        job({ title: SENIORITY_TITLE[jobSen] }),
      );
      expect(aligned).toBeGreaterThanOrEqual(off);
    });
  });
});

// ---------------------------------------------------------------------------
// 7c. Job seniority inference from title / description
// ---------------------------------------------------------------------------

const seniorityTitleCases = [
  { title: "Entry-level Clerk", expected: "entry" },
  { title: "Trainee Accountant", expected: "entry" },
  { title: "Junior Developer", expected: "junior" },
  { title: "Graduate Programme", expected: "junior" },
  { title: "Intermediate Accountant", expected: "mid" },
  { title: "Senior Software Engineer", expected: "senior" },
  { title: "Lead Data Engineer", expected: "lead" },
  { title: "Principal Architect", expected: "lead" },
  { title: "Executive Director", expected: "executive" },
  { title: "Head of Finance", expected: "executive" },
  { title: "Software Developer", expected: null },
  { title: "Accountant", expected: null },
];

describe("matching — job seniority inference", () => {
  it.each(seniorityTitleCases)("title '$title' → $expected", ({ title, expected }) => {
    expect(inferJobSeniority(job({ title }))).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// 8. Travel radius gate
// ---------------------------------------------------------------------------

const JHB = { lat: -26.2041, lon: 28.0473 };
const radiusCases = SA_CITIES.flatMap((to) =>
  [0, 50, 200, 1000].map((radius) => {
    const km = haversineKm(JHB, { lat: to.lat, lon: to.lon });
    return { to: to.city, radius, expected: radius > 0 && km > radius };
  }),
);

describe("matching matrix — willing-to-travel radius gate", () => {
  it.each(radiusCases)("Johannesburg seeker, $to, radius=$radius km → outside=$expected", ({
    to,
    radius,
    expected,
  }) => {
    const city = SA_CITIES.find((c) => c.city === to);
    if (!city) throw new Error("fixture city missing");
    const c = candidate({
      locationLat: JHB.lat,
      locationLon: JHB.lon,
      workProfile: workProfile({ willingToTravelKm: radius }),
    });
    const j = job({ locationLat: city.lat, locationLon: city.lon });
    expect(service.isOutsideTravelRadius(c, j)).toBe(expected);
  });

  it("never flags 'outside' without a positive radius or without coordinates", () => {
    const here = job({ locationLat: -29.8587, locationLon: 31.0218 });
    expect(
      service.isOutsideTravelRadius(
        candidate({
          locationLat: JHB.lat,
          locationLon: JHB.lon,
          workProfile: workProfile({ willingToTravelKm: 0 }),
        }),
        here,
      ),
    ).toBe(false);
    expect(
      service.isOutsideTravelRadius(
        candidate({
          locationLat: JHB.lat,
          locationLon: JHB.lon,
          workProfile: workProfile({ willingToTravelKm: null }),
        }),
        here,
      ),
    ).toBe(false);
    // no candidate coords → distance null → never outside
    expect(
      service.isOutsideTravelRadius(
        candidate({
          locationLat: null,
          locationLon: null,
          workProfile: workProfile({ willingToTravelKm: 50 }),
        }),
        here,
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 11. Weight profiles (A/B) — alternative weight sets re-rank as intended
// ---------------------------------------------------------------------------

describe("matching matrix — weight profiles (A/B)", () => {
  const seeker = candidate({
    extractedData: cv({ skills: ["python", "sql", "react"], experienceYears: 5 }),
    workProfile: null,
  });

  it("every profile's weights sum to 1.0", () => {
    for (const profile of Object.values(WEIGHT_PROFILES)) {
      const total =
        profile.embedding + profile.skills + profile.experience + profile.location + profile.salary;
      expect(total).toBeCloseTo(1, 6);
    }
  });

  it("skills-forward lifts a low-embedding, high-skills job above default", () => {
    const skillsStrong = job({ title: "Developer", extractedSkills: ["python", "sql", "react"] });
    const lowSim = 0.3;
    const def = service.computeMatch(seeker, skillsStrong, lowSim, 0, [], DEFAULT_WEIGHTS);
    const sf = service.computeMatch(
      seeker,
      skillsStrong,
      lowSim,
      0,
      [],
      weightProfile("skills-forward"),
    );
    expect(sf.overallScore).toBeGreaterThan(def.overallScore);
  });

  it("default keeps a high-embedding, no-skills-overlap job above skills-forward", () => {
    const embStrong = job({ title: "Welder", extractedSkills: ["welding", "fitting"] });
    const highSim = 0.9;
    const def = service.computeMatch(seeker, embStrong, highSim, 0, [], DEFAULT_WEIGHTS);
    const sf = service.computeMatch(
      seeker,
      embStrong,
      highSim,
      0,
      [],
      weightProfile("skills-forward"),
    );
    expect(def.overallScore).toBeGreaterThan(sf.overallScore);
  });

  it("an unknown profile name falls back to the default weights", () => {
    expect(weightProfile("nope")).toBe(DEFAULT_WEIGHTS);
  });
});
