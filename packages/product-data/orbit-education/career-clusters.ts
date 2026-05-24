/**
 * Career clusters used for FuturePath's career-fit + programme grouping. These
 * connect a learner's interests to programme families and (later) to Orbit's
 * job-market categories at the employment end. Deliberately coarse — refine
 * with curated programme data, not by inventing sub-clusters here.
 */

import type { OrbitEducationCapability } from "./capabilities";

export const ORBIT_EDUCATION_CAREER_CLUSTERS = [
  "engineering_built_environment",
  "health_sciences",
  "commerce_business",
  "law",
  "information_technology",
  "natural_sciences",
  "humanities_social_sciences",
  "education",
  "arts_design",
  "agriculture",
] as const;

export type OrbitEducationCareerCluster = (typeof ORBIT_EDUCATION_CAREER_CLUSTERS)[number];

export interface CareerClusterMeta {
  code: OrbitEducationCareerCluster;
  label: string;
}

export const ORBIT_EDUCATION_CAREER_CLUSTER_META: Record<
  OrbitEducationCareerCluster,
  CareerClusterMeta
> = {
  engineering_built_environment: {
    code: "engineering_built_environment",
    label: "Engineering & Built Environment",
  },
  health_sciences: { code: "health_sciences", label: "Health Sciences" },
  commerce_business: { code: "commerce_business", label: "Commerce & Business" },
  law: { code: "law", label: "Law" },
  information_technology: { code: "information_technology", label: "Information Technology" },
  natural_sciences: { code: "natural_sciences", label: "Natural Sciences" },
  humanities_social_sciences: {
    code: "humanities_social_sciences",
    label: "Humanities & Social Sciences",
  },
  education: { code: "education", label: "Education" },
  arts_design: { code: "arts_design", label: "Arts & Design" },
  agriculture: { code: "agriculture", label: "Agriculture & Environmental Sciences" },
};

/**
 * Which capabilities a cluster draws on, for the careerFit signal (#304). This
 * powers a TRANSPARENT subject-alignment score ("how well your subjects line up
 * with this field"), NOT an admission or employment probability — careerFit is
 * self-assessment guidance, deliberately distinct from the eligibility-% the
 * honesty guardrail forbids.
 */
export const CLUSTER_CAPABILITY_AFFINITY: Record<
  OrbitEducationCareerCluster,
  OrbitEducationCapability[]
> = {
  engineering_built_environment: ["quantitative_reasoning", "physical_science_foundation"],
  health_sciences: ["life_science_foundation", "quantitative_reasoning"],
  commerce_business: ["commerce_economics", "quantitative_reasoning"],
  law: ["academic_writing", "humanities_social_science", "language_proficiency"],
  information_technology: ["computational_thinking", "quantitative_reasoning"],
  natural_sciences: [
    "physical_science_foundation",
    "life_science_foundation",
    "quantitative_reasoning",
  ],
  humanities_social_sciences: [
    "humanities_social_science",
    "language_proficiency",
    "academic_writing",
  ],
  education: ["language_proficiency", "humanities_social_science"],
  arts_design: ["creative_arts"],
  agriculture: ["life_science_foundation", "physical_science_foundation"],
};
