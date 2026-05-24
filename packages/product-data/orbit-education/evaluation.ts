/**
 * The pure FuturePath evaluation engine (#308). No DB, no IO — given an
 * applicant's normalised results and a RequirementSpec, produce an
 * EvaluationResult with three INDEPENDENT layers:
 *   1. eligibility   — binary admission gates ("must have NSC Maths ≥ 50%")
 *   2. scoring       — the numeric (or boolean) rank per the spec's strategy
 *   3. competitiveness — Reach / Match / Safe band vs the cut-off
 * Every layer emits a human-readable explanation trace so the UI / mentor can
 * say WHY (never a fabricated %). Deterministic only — no ML.
 */

import type { OrbitEducationCapability, SubjectRole } from "./capabilities";
import { nscLevelForPercent } from "./nsc";
import type {
  EligibilityGate,
  Provenance,
  RequirementSpec,
  ScoringStrategy,
  SubjectSelection,
  SubjectWeightRule,
} from "./requirement-spec";
import { A_LEVEL_TARIFF, type ALevelGrade } from "./ucas-tariff";

export interface ApplicantSubjectResult {
  name: string;
  capability: OrbitEducationCapability | null;
  roles: SubjectRole[];
  /** Raw percentage (SA schemes). */
  percent: number | null;
  /** A-Level grade (UK tariff / named-grade schemes). */
  aLevelGrade?: ALevelGrade | null;
}

export interface ApplicantProfile {
  subjects: ApplicantSubjectResult[];
  /** Supplementary assessment scores keyed by code (NBT_AL, UCAT, …). */
  assessments?: Record<string, number>;
  /** Context values (0–1) for redress rules, keyed by contextKey. */
  context?: Record<string, number>;
}

export type CompetitivenessBand = "safe" | "match" | "reach" | "below" | "unknown";

export interface GateResult {
  description: string;
  passed: boolean;
  reason: string;
}

export interface SelectedSubject {
  name: string;
  baseContribution: number;
  weightedContribution: number;
}

export interface EvaluationResult {
  eligibility: { passed: boolean; gates: GateResult[] };
  scoring: {
    strategy: ScoringStrategy;
    /** Numeric strategies: the raw score. Null for NAMED_GRADE_MATCH. */
    rawScore: number | null;
    /** After redress uplift (= rawScore when no redress applies). */
    adjustedScore: number | null;
    maxScore: number | null;
    /** NAMED_GRADE_MATCH only: did the grade profile match? */
    matched: boolean | null;
    selectedSubjects: SelectedSubject[];
    excludedSubjects: string[];
  };
  competitiveness: { band: CompetitivenessBand; cutOff: number | null; margin: number | null };
  explanation: string[];
  provenance: Provenance;
}

function hasAnyRole(subject: ApplicantSubjectResult, roles: readonly SubjectRole[]): boolean {
  return subject.roles.some((role) => roles.includes(role));
}

function weightMatchesSubject(rule: SubjectWeightRule, subject: ApplicantSubjectResult): boolean {
  if (rule.role && subject.roles.includes(rule.role)) return true;
  if (rule.capability && subject.capability === rule.capability) return true;
  return false;
}

function applyWeights(
  base: number,
  subject: ApplicantSubjectResult,
  rules: readonly SubjectWeightRule[],
): number {
  return rules.reduce((value, rule) => {
    if (!weightMatchesSubject(rule, subject)) return value;
    let next = value;
    if (rule.multiplier != null) next = next * rule.multiplier;
    if (rule.bonusPoints != null) {
      const percent = subject.percent ?? 0;
      const bonusEligible = rule.minPercentForBonus == null || percent >= rule.minPercentForBonus;
      if (bonusEligible) next = next + rule.bonusPoints;
    }
    if (rule.cap != null && next > rule.cap) next = rule.cap;
    return next;
  }, base);
}

/** Pick the subjects that feed the score, honouring include/exclude/floor + bestN. */
function selectSubjects(
  subjects: readonly ApplicantSubjectResult[],
  selection: SubjectSelection,
  rankBy: (s: ApplicantSubjectResult) => number,
): { selected: ApplicantSubjectResult[]; excluded: string[] } {
  const excludeRoles = selection.excludeRoles ?? [];
  const afterExclusions = subjects.filter((s) => !hasAnyRole(s, excludeRoles));
  const floor = selection.minSubjectPercent;
  const eligible = afterExclusions.filter((s) => floor == null || (s.percent ?? 0) >= floor);

  const includeRoles = selection.includeRoles ?? [];
  const forced = eligible.filter((s) => hasAnyRole(s, includeRoles));
  const rest = eligible
    .filter((s) => !hasAnyRole(s, includeRoles))
    .sort((a, b) => rankBy(b) - rankBy(a));

  const remainingSlots = Math.max(0, selection.bestN - forced.length);
  const selected = [...forced, ...rest.slice(0, remainingSlots)];
  const selectedNames = new Set(selected.map((s) => s.name));
  const excluded = subjects.filter((s) => !selectedNames.has(s.name)).map((s) => s.name);
  return { selected, excluded };
}

function gradeTariff(grade: ALevelGrade | null | undefined): number {
  return grade ? A_LEVEL_TARIFF[grade] : 0;
}

function evaluateGate(gate: EligibilityGate, profile: ApplicantProfile): GateResult {
  if (gate.forbidRole) {
    const offending = profile.subjects.find((s) =>
      s.roles.includes(gate.forbidRole as SubjectRole),
    );
    if (offending) {
      return {
        description: gate.description,
        passed: false,
        reason: `${offending.name} is not permitted here`,
      };
    }
  }
  const needsSubject = gate.capability != null || gate.role != null;
  if (!needsSubject) {
    return { description: gate.description, passed: true, reason: "satisfied" };
  }
  const match = profile.subjects.find((s) => {
    if (gate.capability && s.capability === gate.capability) return true;
    if (gate.role && s.roles.includes(gate.role)) return true;
    return false;
  });
  if (!match) {
    return { description: gate.description, passed: false, reason: "required subject not present" };
  }
  if (gate.minPercent != null && (match.percent ?? 0) < gate.minPercent) {
    return {
      description: gate.description,
      passed: false,
      reason: `${match.name} ${match.percent ?? 0}% below required ${gate.minPercent}%`,
    };
  }
  if (gate.minGrade != null && gradeTariff(match.aLevelGrade) < gradeTariff(gate.minGrade)) {
    return {
      description: gate.description,
      passed: false,
      reason: `${match.name} below required grade ${gate.minGrade}`,
    };
  }
  return { description: gate.description, passed: true, reason: `met by ${match.name}` };
}

function contributionForStrategy(
  strategy: ScoringStrategy,
  subject: ApplicantSubjectResult,
  levelPointsScheme: "nsc" | "wits8",
): number {
  if (strategy === "TARIFF_SUM") return gradeTariff(subject.aLevelGrade);
  if (strategy === "SUM_LEVEL_POINTS") {
    const level = nscLevelForPercent(subject.percent ?? 0);
    return levelPointsScheme === "wits8" ? level + 1 : level;
  }
  // SUM_RAW_PERCENT and PERCENT_AGGREGATE_MEAN both use the raw percentage.
  return subject.percent ?? 0;
}

function matchNamedGrades(profile: ApplicantProfile, spec: RequirementSpec): boolean {
  const req = spec.namedGradeRequirement;
  if (!req) return false;
  const applicantGrades = profile.subjects
    .map((s) => s.aLevelGrade)
    .filter((g): g is ALevelGrade => g != null)
    .sort((a, b) => A_LEVEL_TARIFF[b] - A_LEVEL_TARIFF[a]);
  const required = [...req.requiredGrades].sort((a, b) => A_LEVEL_TARIFF[b] - A_LEVEL_TARIFF[a]);
  if (applicantGrades.length < required.length) return false;
  const gradesOk = required.every(
    (needed, i) => gradeTariff(applicantGrades[i]) >= gradeTariff(needed),
  );
  if (!gradesOk) return false;
  const conditions = req.subjectConditions ?? [];
  return conditions.every((cond) => {
    const subject = profile.subjects.find((s) => s.capability === cond.capability);
    return subject != null && gradeTariff(subject.aLevelGrade) >= gradeTariff(cond.minGrade);
  });
}

function bandFor(
  score: number,
  spec: RequirementSpec,
): { band: CompetitivenessBand; margin: number | null } {
  const cutOff = spec.cutOff;
  if (!cutOff) return { band: "unknown", margin: null };
  const margin = score - cutOff.value;
  if (score >= cutOff.value + cutOff.safeMargin) return { band: "safe", margin };
  if (score >= cutOff.value) return { band: "match", margin };
  if (score >= cutOff.value - cutOff.reachMargin) return { band: "reach", margin };
  return { band: "below", margin };
}

export function evaluateRequirement(
  profile: ApplicantProfile,
  spec: RequirementSpec,
): EvaluationResult {
  const explanation: string[] = [];

  // Layer 1 — eligibility gates.
  const gates = (spec.eligibilityGates ?? []).map((gate) => evaluateGate(gate, profile));
  const eligible = gates.every((g) => g.passed);
  for (const gate of gates) {
    if (!gate.passed) explanation.push(`Eligibility: ${gate.description} — ${gate.reason}`);
  }
  if (eligible && gates.length > 0) explanation.push("Eligibility: all gates passed");

  // Layer 2 — scoring.
  if (spec.strategy === "NAMED_GRADE_MATCH") {
    const matched = matchNamedGrades(profile, spec);
    explanation.push(
      matched
        ? "Grades match the named-grade requirement"
        : "Grades do not meet the named-grade requirement",
    );
    return {
      eligibility: { passed: eligible, gates },
      scoring: {
        strategy: spec.strategy,
        rawScore: null,
        adjustedScore: null,
        maxScore: null,
        matched,
        selectedSubjects: [],
        excludedSubjects: [],
      },
      competitiveness: { band: matched ? "match" : "below", cutOff: null, margin: null },
      explanation,
      provenance: spec.provenance,
    };
  }

  const selection = spec.subjectSelection ?? { bestN: profile.subjects.length };
  const levelScheme = spec.levelPointsScheme ?? "nsc";
  const weights = spec.weights ?? [];
  const rankBy = (s: ApplicantSubjectResult) =>
    contributionForStrategy(spec.strategy, s, levelScheme);

  const { selected, excluded } = selectSubjects(profile.subjects, selection, rankBy);

  const selectedSubjects: SelectedSubject[] = selected.map((subject) => {
    const base = contributionForStrategy(spec.strategy, subject, levelScheme);
    const weighted = applyWeights(base, subject, weights);
    return { name: subject.name, baseContribution: base, weightedContribution: weighted };
  });

  const total = selectedSubjects.reduce((sum, s) => sum + s.weightedContribution, 0);
  const rawScore =
    spec.strategy === "PERCENT_AGGREGATE_MEAN" && selectedSubjects.length > 0
      ? total / selectedSubjects.length
      : total;

  // Redress uplift (optional, post-score).
  let adjustedScore = rawScore;
  if (spec.redress) {
    const contextValue = profile.context?.[spec.redress.contextKey] ?? 0;
    const clamped = Math.max(0, Math.min(1, contextValue));
    const uplift = rawScore * spec.redress.maxUpliftFraction * clamped;
    adjustedScore = rawScore + uplift;
    if (uplift > 0) {
      explanation.push(`Redress: ${spec.redress.description} applied +${uplift.toFixed(1)}`);
    }
  }

  explanation.push(
    `Scoring (${spec.strategy}): ${selectedSubjects.map((s) => s.name).join(", ")} → ${adjustedScore.toFixed(1)}`,
  );
  if (excluded.length > 0) explanation.push(`Excluded from score: ${excluded.join(", ")}`);

  // Layer 3 — competitiveness band.
  const { band, margin } = bandFor(adjustedScore, spec);
  if (spec.cutOff) {
    explanation.push(
      `Competitiveness: ${band} (cut-off ${spec.cutOff.value}, you ${adjustedScore.toFixed(1)})`,
    );
  }

  return {
    eligibility: { passed: eligible, gates },
    scoring: {
      strategy: spec.strategy,
      rawScore,
      adjustedScore,
      maxScore: null,
      matched: null,
      selectedSubjects,
      excludedSubjects: excluded,
    },
    competitiveness: {
      band: eligible ? band : "below",
      cutOff: spec.cutOff?.value ?? null,
      margin,
    },
    explanation,
    provenance: spec.provenance,
  };
}
