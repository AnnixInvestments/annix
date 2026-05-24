/**
 * School-leaving curricula FuturePath understands. Canonical home for the
 * curriculum enum (the annix-orbit-education backend re-exports this — do not
 * redefine it there). MVP corridor (D6) is SA (NSC/IEB) + UK (A-Level/GCSE),
 * with Cambridge/IB/US kept in the enum for the next corridor.
 */

export const ORBIT_EDUCATION_CURRICULA = [
  "NSC",
  "IEB",
  "Cambridge",
  "IB",
  "GCSE",
  "A-Level",
  "US-GPA",
  "Other",
] as const;

export type OrbitEducationCurriculum = (typeof ORBIT_EDUCATION_CURRICULA)[number];

export interface CurriculumMeta {
  code: OrbitEducationCurriculum;
  label: string;
  region: "ZA" | "UK" | "INTL" | "US";
  /** The score units this curriculum's results are naturally expressed in. */
  resultUnit: "percent" | "nsc-level" | "named-grade" | "gpa";
}

export const ORBIT_EDUCATION_CURRICULUM_META: Record<OrbitEducationCurriculum, CurriculumMeta> = {
  NSC: {
    code: "NSC",
    label: "National Senior Certificate (SA)",
    region: "ZA",
    resultUnit: "percent",
  },
  IEB: {
    code: "IEB",
    label: "Independent Examinations Board (SA)",
    region: "ZA",
    resultUnit: "percent",
  },
  Cambridge: {
    code: "Cambridge",
    label: "Cambridge International",
    region: "INTL",
    resultUnit: "named-grade",
  },
  IB: {
    code: "IB",
    label: "International Baccalaureate",
    region: "INTL",
    resultUnit: "named-grade",
  },
  GCSE: { code: "GCSE", label: "GCSE (UK)", region: "UK", resultUnit: "named-grade" },
  "A-Level": { code: "A-Level", label: "A-Level (UK)", region: "UK", resultUnit: "named-grade" },
  "US-GPA": { code: "US-GPA", label: "US High School GPA", region: "US", resultUnit: "gpa" },
  Other: { code: "Other", label: "Other / not listed", region: "INTL", resultUnit: "percent" },
};

export function isOrbitEducationCurriculum(value: string): value is OrbitEducationCurriculum {
  return (ORBIT_EDUCATION_CURRICULA as readonly string[]).includes(value);
}
