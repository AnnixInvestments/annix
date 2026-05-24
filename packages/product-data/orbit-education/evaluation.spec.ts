import { describe, expect, it } from "vitest";
import { type ApplicantSubjectResult, evaluateRequirement } from "./evaluation";
import type { Provenance, RequirementSpec } from "./requirement-spec";

/**
 * NOTE: the specs below are ILLUSTRATIVE shapes modelled on the published
 * scoring methods — NOT the seeded production requirements (those carry
 * owner-verified numbers). They exercise the engine's structural behaviour.
 */

const PROV: Provenance = {
  sources: ["illustrative test fixture"],
  confidence: "LOW",
  verificationStatus: "NEEDS_REVIEW",
  intakeYear: 2027,
};

function subject(
  name: string,
  percent: number | null,
  roles: ApplicantSubjectResult["roles"],
  capability: ApplicantSubjectResult["capability"] = null,
  aLevelGrade: ApplicantSubjectResult["aLevelGrade"] = null,
): ApplicantSubjectResult {
  return { name, percent, roles, capability, aLevelGrade };
}

describe("evaluateRequirement — SUM_RAW_PERCENT (UCT FPS shape)", () => {
  const spec: RequirementSpec = {
    strategy: "SUM_RAW_PERCENT",
    subjectSelection: {
      bestN: 6,
      includeRoles: ["language_of_instruction"],
      excludeRoles: ["excluded"],
      minSubjectPercent: 40,
    },
    cutOff: { value: 450, unit: "points", reachMargin: 30, safeMargin: 30 },
    provenance: PROV,
  };

  it("sums the best 6 percentages, includes language, excludes Life Orientation", () => {
    const profile = {
      subjects: [
        subject("English", 80, ["language_of_instruction"], "language_proficiency"),
        subject("Mathematics", 90, ["mathematics"], "quantitative_reasoning"),
        subject("Physical Sciences", 85, [], "physical_science_foundation"),
        subject("Life Sciences", 70, [], "life_science_foundation"),
        subject("Geography", 65, [], "humanities_social_science"),
        subject("Accounting", 60, [], "commerce_economics"),
        subject("Life Orientation", 95, ["excluded"]),
      ],
    };
    const result = evaluateRequirement(profile, spec);
    // 80+90+85+70+65+60 = 450 (LO excluded despite being highest)
    expect(result.scoring.rawScore).toBe(450);
    expect(result.scoring.excludedSubjects).toContain("Life Orientation");
    expect(result.competitiveness.band).toBe("match");
  });

  it("drops subjects below the 40% floor", () => {
    const profile = {
      subjects: [
        subject("English", 50, ["language_of_instruction"], "language_proficiency"),
        subject("Mathematics", 35, ["mathematics"], "quantitative_reasoning"),
        subject("Geography", 60, [], "humanities_social_science"),
      ],
    };
    const result = evaluateRequirement(profile, spec);
    expect(result.scoring.selectedSubjects.map((s) => s.name)).not.toContain("Mathematics");
  });

  it("applies a Science-style ×2 multiplier on maths/science", () => {
    const sciSpec: RequirementSpec = {
      ...spec,
      weights: [
        { capability: "quantitative_reasoning", multiplier: 2 },
        { capability: "physical_science_foundation", multiplier: 2 },
      ],
    };
    const profile = {
      subjects: [
        subject("English", 70, ["language_of_instruction"], "language_proficiency"),
        subject("Mathematics", 80, ["mathematics"], "quantitative_reasoning"),
        subject("Physical Sciences", 80, [], "physical_science_foundation"),
      ],
    };
    const result = evaluateRequirement(profile, sciSpec);
    // 70 + (80*2) + (80*2) = 70 + 160 + 160 = 390
    expect(result.scoring.rawScore).toBe(390);
  });
});

describe("evaluateRequirement — SUM_LEVEL_POINTS (Wits APS shape)", () => {
  const spec: RequirementSpec = {
    strategy: "SUM_LEVEL_POINTS",
    levelPointsScheme: "wits8",
    subjectSelection: { bestN: 7 },
    weights: [
      { capability: "quantitative_reasoning", bonusPoints: 2 },
      { capability: "language_proficiency", bonusPoints: 2 },
      { role: "excluded", cap: 4 },
    ],
    cutOff: { value: 42, unit: "points", reachMargin: 4, safeMargin: 4 },
    provenance: PROV,
  };

  it("converts percentages to 8-point levels and applies Eng/Maths bonuses", () => {
    const profile = {
      subjects: [
        subject("English", 85, ["language_of_instruction"], "language_proficiency"), // L7 → 8 +2 = 10
        subject("Mathematics", 75, ["mathematics"], "quantitative_reasoning"), // L6 → 7 +2 = 9
        subject("Physical Sciences", 65, [], "physical_science_foundation"), // L5 → 6
        subject("Life Sciences", 55, [], "life_science_foundation"), // L4 → 5
        subject("Geography", 45, [], "humanities_social_science"), // L3 → 4
        subject("Accounting", 62, [], "commerce_economics"), // L5 → 6
      ],
    };
    const result = evaluateRequirement(profile, spec);
    // 10 + 9 + 6 + 5 + 4 + 6 = 40
    expect(result.scoring.rawScore).toBe(40);
    expect(result.competitiveness.band).toBe("reach"); // 40 within 42-4=38..42
  });
});

describe("evaluateRequirement — PERCENT_AGGREGATE_MEAN (Stellenbosch shape)", () => {
  it("averages the selected subject percentages", () => {
    const spec: RequirementSpec = {
      strategy: "PERCENT_AGGREGATE_MEAN",
      subjectSelection: {
        bestN: 6,
        includeRoles: ["language_of_instruction"],
        excludeRoles: ["excluded"],
      },
      cutOff: { value: 70, unit: "percent", reachMargin: 5, safeMargin: 10 },
      provenance: PROV,
    };
    const profile = {
      subjects: [
        subject("English", 90, ["language_of_instruction"], "language_proficiency"),
        subject("Mathematics", 80, ["mathematics"], "quantitative_reasoning"),
        subject("Physical Sciences", 80, [], "physical_science_foundation"),
        subject("Life Sciences", 70, [], "life_science_foundation"),
        subject("Geography", 70, [], "humanities_social_science"),
        subject("Accounting", 70, [], "commerce_economics"),
      ],
    };
    const result = evaluateRequirement(profile, spec);
    // (90+80+80+70+70+70)/6 = 460/6 = 76.67
    expect(result.scoring.rawScore).toBeCloseTo(76.67, 1);
    expect(result.competitiveness.band).toBe("match"); // ≥70, <80
  });
});

describe("evaluateRequirement — TARIFF_SUM + NAMED_GRADE_MATCH (UK)", () => {
  it("sums A-Level tariff points and bands against a cut-off", () => {
    const spec: RequirementSpec = {
      strategy: "TARIFF_SUM",
      subjectSelection: { bestN: 3 },
      cutOff: { value: 128, unit: "points", reachMargin: 8, safeMargin: 8 },
      provenance: PROV,
    };
    const profile = {
      subjects: [
        subject("Maths", null, ["mathematics"], "quantitative_reasoning", "A"), // 48
        subject("Physics", null, [], "physical_science_foundation", "A"), // 48
        subject("Chemistry", null, [], null, "B"), // 40
      ],
    };
    const result = evaluateRequirement(profile, spec);
    expect(result.scoring.rawScore).toBe(136); // 48+48+40
    expect(result.competitiveness.band).toBe("safe"); // ≥ 128+8
  });

  it("matches a named-grade requirement including a subject condition", () => {
    const spec: RequirementSpec = {
      strategy: "NAMED_GRADE_MATCH",
      namedGradeRequirement: {
        requiredGrades: ["A", "A", "B"],
        subjectConditions: [{ capability: "quantitative_reasoning", minGrade: "A" }],
      },
      provenance: PROV,
    };
    const passes = {
      subjects: [
        subject("Maths", null, ["mathematics"], "quantitative_reasoning", "A"),
        subject("Physics", null, [], "physical_science_foundation", "A"),
        subject("Chemistry", null, [], null, "B"),
      ],
    };
    const fails = {
      subjects: [
        subject("Maths", null, ["mathematics"], "quantitative_reasoning", "B"), // condition needs A
        subject("Physics", null, [], "physical_science_foundation", "A"),
        subject("Chemistry", null, [], null, "A"),
      ],
    };
    expect(evaluateRequirement(passes, spec).scoring.matched).toBe(true);
    expect(evaluateRequirement(fails, spec).scoring.matched).toBe(false);
  });
});

describe("evaluateRequirement — eligibility gates + redress", () => {
  it("fails when Mathematical Literacy is present where Maths is required", () => {
    const spec: RequirementSpec = {
      strategy: "SUM_RAW_PERCENT",
      subjectSelection: { bestN: 3 },
      eligibilityGates: [
        {
          description: "NSC Mathematics required (not Mathematical Literacy)",
          forbidRole: "mathematical_literacy",
        },
        { description: "Mathematics ≥ 60%", capability: "quantitative_reasoning", minPercent: 60 },
      ],
      cutOff: { value: 150, unit: "points", reachMargin: 20, safeMargin: 20 },
      provenance: PROV,
    };
    const profile = {
      subjects: [
        subject("English", 70, ["language_of_instruction"], "language_proficiency"),
        subject("Mathematical Literacy", 90, ["mathematical_literacy"], "mathematical_literacy"),
        subject("Geography", 80, [], "humanities_social_science"),
      ],
    };
    const result = evaluateRequirement(profile, spec);
    expect(result.eligibility.passed).toBe(false);
    expect(result.competitiveness.band).toBe("below"); // ineligible forces below
  });

  it("fails when a mandatory supplementary assessment is missing or below min", () => {
    const spec: RequirementSpec = {
      strategy: "PERCENT_AGGREGATE_MEAN",
      subjectSelection: { bestN: 2 },
      assessments: [
        { code: "NBT_AL", label: "NBT Academic Literacy", mandatory: true, minScore: 60 },
      ],
      provenance: PROV,
    };
    const missing = {
      subjects: [
        subject("English", 70, ["language_of_instruction"], "language_proficiency"),
        subject("Mathematics", 70, ["mathematics"], "quantitative_reasoning"),
      ],
    };
    const below = { ...missing, assessments: { NBT_AL: 55 } };
    const ok = { ...missing, assessments: { NBT_AL: 70 } };
    expect(evaluateRequirement(missing, spec).eligibility.passed).toBe(false);
    expect(evaluateRequirement(below, spec).eligibility.passed).toBe(false);
    expect(evaluateRequirement(ok, spec).eligibility.passed).toBe(true);
  });

  it("folds a weighted assessment into a composite score (Wits Health 60/40 shape)", () => {
    const spec: RequirementSpec = {
      strategy: "PERCENT_AGGREGATE_MEAN",
      subjectSelection: { bestN: 2 },
      assessments: [
        { code: "NBT", label: "NBT composite", mandatory: false, weightInComposite: 0.4 },
      ],
      cutOff: { value: 70, unit: "percent", reachMargin: 5, safeMargin: 5 },
      provenance: PROV,
    };
    const profile = {
      subjects: [
        subject("English", 80, ["language_of_instruction"], "language_proficiency"),
        subject("Mathematics", 80, ["mathematics"], "quantitative_reasoning"),
      ],
      assessments: { NBT: 50 },
    };
    // academic mean = 80; composite = 80*0.6 + 50*0.4 = 48 + 20 = 68
    const result = evaluateRequirement(profile, spec);
    expect(result.scoring.adjustedScore).toBeCloseTo(68, 5);
    expect(result.competitiveness.band).toBe("reach"); // 68 in [65,70)
  });

  it("applies a redress uplift scaled by context", () => {
    const spec: RequirementSpec = {
      strategy: "SUM_RAW_PERCENT",
      subjectSelection: { bestN: 2 },
      redress: {
        description: "Quintile uplift",
        maxUpliftFraction: 0.1,
        contextKey: "quintileFactor",
      },
      cutOff: { value: 100, unit: "points", reachMargin: 10, safeMargin: 10 },
      provenance: PROV,
    };
    const profile = {
      subjects: [
        subject("English", 50, ["language_of_instruction"], "language_proficiency"),
        subject("Mathematics", 50, ["mathematics"], "quantitative_reasoning"),
      ],
      context: { quintileFactor: 1 },
    };
    const result = evaluateRequirement(profile, spec);
    expect(result.scoring.rawScore).toBe(100);
    expect(result.scoring.adjustedScore).toBeCloseTo(110, 5); // +10%
    expect(result.competitiveness.band).toBe("safe");
  });
});
