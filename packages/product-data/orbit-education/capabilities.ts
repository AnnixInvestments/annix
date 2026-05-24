/**
 * Semantic capability taxonomy + subject roles.
 *
 * The scoring engine targets CAPABILITIES, not raw subject names, so that
 * "NSC Mathematics", "A-Level Mathematics" and "IB Math AA HL" can satisfy the
 * same requirement without rewriting every institution's rules. Each curriculum
 * provides a subject→capability map; rules reference capabilities + roles.
 */

export const ORBIT_EDUCATION_CAPABILITIES = [
  "quantitative_reasoning",
  "mathematical_literacy",
  "language_proficiency",
  "academic_writing",
  "physical_science_foundation",
  "life_science_foundation",
  "computational_thinking",
  "humanities_social_science",
  "commerce_economics",
  "creative_arts",
] as const;

export type OrbitEducationCapability = (typeof ORBIT_EDUCATION_CAPABILITIES)[number];

/**
 * The role a subject plays in a requirement spec's selection/evaluation.
 * `mathematics` is distinguished from `mathematical_literacy` because many SA
 * programmes require NSC Mathematics and explicitly reject Mathematical Literacy.
 */
export const SUBJECT_ROLES = [
  "language_of_instruction",
  "mathematics",
  "mathematical_literacy",
  "required",
  "elective",
  "excluded",
] as const;

export type SubjectRole = (typeof SUBJECT_ROLES)[number];

/** A student's subject result, normalised before it reaches the engine. */
export interface NormalisedSubject {
  /** Raw subject name as the learner entered it (audit/explanation). */
  rawName: string;
  /** Canonical capability this subject maps to, if known. */
  capability: OrbitEducationCapability | null;
  /** Role tags resolved for this subject (a subject can be e.g. both `mathematics` and `required`). */
  roles: SubjectRole[];
  /** Raw percentage (0–100) where the curriculum expresses results as %. */
  percent: number | null;
}

/**
 * Starter NSC subject → capability map (MVP curriculum). Extend per curriculum.
 * Keys are lowercased canonical subject names; callers should lowercase/trim
 * before lookup. NOT exhaustive — unknown subjects map to `null` (treated as a
 * generic elective by the engine).
 */
export const NSC_SUBJECT_CAPABILITY: Record<string, OrbitEducationCapability> = {
  mathematics: "quantitative_reasoning",
  "mathematical literacy": "mathematical_literacy",
  "physical sciences": "physical_science_foundation",
  "life sciences": "life_science_foundation",
  english: "language_proficiency",
  "english home language": "language_proficiency",
  "english first additional language": "language_proficiency",
  afrikaans: "language_proficiency",
  "information technology": "computational_thinking",
  "computer applications technology": "computational_thinking",
  accounting: "commerce_economics",
  "business studies": "commerce_economics",
  economics: "commerce_economics",
  history: "humanities_social_science",
  geography: "humanities_social_science",
  "visual arts": "creative_arts",
  "dramatic arts": "creative_arts",
};

export function nscCapabilityForSubject(subjectName: string): OrbitEducationCapability | null {
  const key = subjectName.trim().toLowerCase();
  const match = NSC_SUBJECT_CAPABILITY[key];
  return match ?? null;
}
