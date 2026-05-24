/**
 * The FuturePath admissions requirement DSL (#308).
 *
 * A requirement is stored as DATA, not code: its `strategy` selects the
 * execution path, and the rest of the fields parameterise it. This is what lets
 * UCT (sum raw %), Wits (sum levels), Stellenbosch (% aggregate) and UK (tariff
 * OR named grades) all run through one engine. Curriculum staff edit specs;
 * engineers don't add a new code path per institution.
 *
 * NOTE: the example specs used in tests are ILLUSTRATIVE shapes modelled on the
 * published methods — they are NOT the seeded production requirements (those
 * carry owner-verified numbers + provenance, per #308's accuracy guardrail).
 */

import type { OrbitEducationCapability, SubjectRole } from "./capabilities";
import type { ALevelGrade } from "./ucas-tariff";

export const SCORING_STRATEGIES = [
  "SUM_RAW_PERCENT", // UCT FPS — sum of raw subject percentages
  "SUM_LEVEL_POINTS", // Wits APS — sum of achievement-level points
  "PERCENT_AGGREGATE_MEAN", // Stellenbosch — mean of selected subject percentages
  "TARIFF_SUM", // UCAS — sum of tariff points
  "NAMED_GRADE_MATCH", // UK named grades — boolean grade-pattern match
] as const;

export type ScoringStrategy = (typeof SCORING_STRATEGIES)[number];

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type VerificationStatus =
  | "VERIFIED_PRIMARY"
  | "VERIFIED_SECONDARY"
  | "NEEDS_REVIEW"
  | "EXPIRED";

/** Provenance + freshness — first-class so admin can queue stale rules. */
export interface Provenance {
  sources: string[];
  confidence: Confidence;
  verificationStatus: VerificationStatus;
  /** Admissions cycle this spec applies to (rules mutate yearly). */
  intakeYear?: number;
  /** ISO date the spec was last verified. */
  asOf?: string;
}

/** How to pick which subjects feed the score. */
export interface SubjectSelection {
  /** Number of subjects to count toward the score. */
  bestN: number;
  /** Roles that must be counted first if the applicant has them (e.g. language_of_instruction). */
  includeRoles?: SubjectRole[];
  /** Roles dropped from selection entirely (e.g. excluded → Life Orientation, Advanced Programme). */
  excludeRoles?: SubjectRole[];
  /** Minimum per-subject percentage to be eligible for selection (UCT 40% floor). */
  minSubjectPercent?: number;
}

/** Per-subject multiplier / bonus / cap, matched by role or capability. */
export interface SubjectWeightRule {
  role?: SubjectRole;
  capability?: OrbitEducationCapability;
  /** Multiply the subject's contribution (UCT Science Maths/Sci ×2). */
  multiplier?: number;
  /** Flat bonus added to the subject's contribution (Wits Eng/Maths +2). */
  bonusPoints?: number;
  /** Bonus only applies when the subject percent is at/above this. */
  minPercentForBonus?: number;
  /** Cap the subject's contribution (Wits Life Orientation cap). */
  cap?: number;
}

/** A hard eligibility gate, evaluated independently of the score. */
export interface EligibilityGate {
  description: string;
  /** Subject (by capability) that must be present. */
  capability?: OrbitEducationCapability;
  /** Subject (by role) that must be present. */
  role?: SubjectRole;
  /** Minimum percentage the matched subject must achieve. */
  minPercent?: number;
  /** Minimum A-Level grade the matched subject must achieve (UK). */
  minGrade?: ALevelGrade;
  /** Role that, if present, fails the gate (e.g. forbid mathematical_literacy where Maths is required). */
  forbidRole?: SubjectRole;
}

/** Supplementary assessment (NBT, UCAT, LNAT…) — generic, not hardcoded. */
export interface AssessmentRequirement {
  code: string;
  label: string;
  mandatory: boolean;
  minScore?: number;
  /** Fraction (0–1) this assessment contributes to a composite score (Wits Health ~0.4). */
  weightInComposite?: number;
}

/** Named-grade requirement for UK NAMED_GRADE_MATCH (e.g. "AAB including A in Maths"). */
export interface NamedGradeRequirement {
  /** Required grades as a multiset, highest-first irrelevant (e.g. ["A","A","B"]). */
  requiredGrades: ALevelGrade[];
  /** Optional per-capability minimum-grade conditions ("...including A in Mathematics"). */
  subjectConditions?: { capability: OrbitEducationCapability; minGrade: ALevelGrade }[];
}

export interface CutOff {
  value: number;
  unit: "points" | "percent";
  /**
   * Banding margins (see `bandFor` in evaluation.ts):
   *   score ≥ value + safeMargin           ⇒ "safe"
   *   value ≤ score < value + safeMargin    ⇒ "match"
   *   value − reachMargin ≤ score < value   ⇒ "reach"
   *   score < value − reachMargin           ⇒ "below"
   */
  reachMargin: number;
  safeMargin: number;
}

/** Optional post-score redress uplift (UCT WPS). Applied after scoring. */
export interface RedressRule {
  description: string;
  /** Max uplift as a fraction of the score (e.g. 0.1 = +10%). */
  maxUpliftFraction: number;
  /** Applicant-context key (0–1) scaling the uplift (school quintile factor, etc.). */
  contextKey: string;
}

export interface RequirementSpec {
  strategy: ScoringStrategy;
  subjectSelection?: SubjectSelection;
  /** Level-points scheme for SUM_LEVEL_POINTS: "nsc" (points = level) or "wits8" (points = level + 1). */
  levelPointsScheme?: "nsc" | "wits8";
  weights?: SubjectWeightRule[];
  eligibilityGates?: EligibilityGate[];
  assessments?: AssessmentRequirement[];
  namedGradeRequirement?: NamedGradeRequirement;
  cutOff?: CutOff;
  redress?: RedressRule;
  provenance: Provenance;
}
