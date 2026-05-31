import type { ModuleLicensingDefinition } from "../../licensing";

export const ANNIX_ORBIT_MODULE_KEY = "annix-orbit";

export const ANNIX_ORBIT_FEATURES = {
  JOB_POSTING: "JOB_POSTING",
  CANDIDATE_MATCHING: "CANDIDATE_MATCHING",
  REFERENCE_CHECKS: "REFERENCE_CHECKS",
  INTERVIEW_SCHEDULING: "INTERVIEW_SCHEDULING",
  EE_COMPLIANCE: "EE_COMPLIANCE",
  ANALYTICS: "ANALYTICS",
} as const;

export type AnnixOrbitFeatureKey = (typeof ANNIX_ORBIT_FEATURES)[keyof typeof ANNIX_ORBIT_FEATURES];

export const ANNIX_ORBIT_TIERS = {
  STARTER: "starter",
  GROWTH: "growth",
  ENTERPRISE: "enterprise",
} as const;

export type AnnixOrbitTierKey = (typeof ANNIX_ORBIT_TIERS)[keyof typeof ANNIX_ORBIT_TIERS];

export const ANNIX_ORBIT_LICENSING: ModuleLicensingDefinition = {
  moduleKey: ANNIX_ORBIT_MODULE_KEY,
  defaultTier: ANNIX_ORBIT_TIERS.STARTER,
  features: [
    {
      key: ANNIX_ORBIT_FEATURES.JOB_POSTING,
      label: "Job posting",
      description: "Post and manage roles, and distribute them to external job boards.",
      category: "Hiring",
      displayOrder: 0,
    },
    {
      key: ANNIX_ORBIT_FEATURES.CANDIDATE_MATCHING,
      label: "Candidate matching",
      description: "Nix-powered matching of seekers to your open roles.",
      category: "Hiring",
      displayOrder: 1,
    },
    {
      key: ANNIX_ORBIT_FEATURES.REFERENCE_CHECKS,
      label: "Reference checks",
      description:
        "Automated reference-check requests to a candidate's referees, with star ratings and feedback returned to your team.",
      category: "Hiring",
      displayOrder: 2,
    },
    {
      key: ANNIX_ORBIT_FEATURES.INTERVIEW_SCHEDULING,
      label: "Interview scheduling",
      description: "Interview slots, invites and candidate self-booking.",
      category: "Hiring",
      displayOrder: 3,
    },
    {
      key: ANNIX_ORBIT_FEATURES.EE_COMPLIANCE,
      label: "Employment Equity compliance",
      description: "EE sectoral targets, candidate EE attributes and EE reporting.",
      category: "Compliance",
      displayOrder: 4,
    },
    {
      key: ANNIX_ORBIT_FEATURES.ANALYTICS,
      label: "Hiring analytics",
      description: "Conversion funnel, time-to-fill, match accuracy and market trends.",
      category: "Analytics",
      displayOrder: 5,
    },
  ],
  tiers: [
    {
      key: ANNIX_ORBIT_TIERS.STARTER,
      name: "Starter",
      description: "Post roles and match candidates.",
      rank: 0,
      monthlyPriceCents: 0,
      annualPriceCents: 0,
      includedSeats: 2,
      aiDocAllowance: 0,
      visibility: "public",
      displayOrder: 0,
    },
    {
      key: ANNIX_ORBIT_TIERS.GROWTH,
      name: "Growth",
      description: "Adds reference checks and interview scheduling for active hiring teams.",
      rank: 1,
      monthlyPriceCents: 250_000,
      annualPriceCents: 2_500_000,
      includedSeats: 5,
      aiDocAllowance: 0,
      visibility: "public",
      displayOrder: 1,
    },
    {
      key: ANNIX_ORBIT_TIERS.ENTERPRISE,
      name: "Enterprise",
      description: "Everything, including EE compliance and hiring analytics.",
      rank: 2,
      monthlyPriceCents: 600_000,
      annualPriceCents: 6_000_000,
      includedSeats: 999,
      aiDocAllowance: 0,
      visibility: "public",
      displayOrder: 2,
    },
  ],
  tierFeatures: {
    [ANNIX_ORBIT_TIERS.STARTER]: [
      ANNIX_ORBIT_FEATURES.JOB_POSTING,
      ANNIX_ORBIT_FEATURES.CANDIDATE_MATCHING,
    ],
    [ANNIX_ORBIT_TIERS.GROWTH]: [
      ANNIX_ORBIT_FEATURES.JOB_POSTING,
      ANNIX_ORBIT_FEATURES.CANDIDATE_MATCHING,
      ANNIX_ORBIT_FEATURES.REFERENCE_CHECKS,
      ANNIX_ORBIT_FEATURES.INTERVIEW_SCHEDULING,
    ],
    [ANNIX_ORBIT_TIERS.ENTERPRISE]: [
      ANNIX_ORBIT_FEATURES.JOB_POSTING,
      ANNIX_ORBIT_FEATURES.CANDIDATE_MATCHING,
      ANNIX_ORBIT_FEATURES.REFERENCE_CHECKS,
      ANNIX_ORBIT_FEATURES.INTERVIEW_SCHEDULING,
      ANNIX_ORBIT_FEATURES.EE_COMPLIANCE,
      ANNIX_ORBIT_FEATURES.ANALYTICS,
    ],
  },
};
