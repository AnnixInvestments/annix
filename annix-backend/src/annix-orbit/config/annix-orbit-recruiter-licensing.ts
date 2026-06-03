import type { ModuleLicensingDefinition } from "../../licensing";

export const ANNIX_ORBIT_RECRUITER_MODULE_KEY = "annix-orbit-recruiter";

export const ANNIX_ORBIT_RECRUITER_FEATURES = {
  CLIENTS: "CLIENTS",
  TALENT_POOLS: "TALENT_POOLS",
  AI_MATCHING: "AI_MATCHING",
  SUBMISSIONS: "SUBMISSIONS",
  PLACEMENTS: "PLACEMENTS",
  TEAM: "TEAM",
  ANALYTICS: "ANALYTICS",
} as const;

export type AnnixOrbitRecruiterFeatureKey =
  (typeof ANNIX_ORBIT_RECRUITER_FEATURES)[keyof typeof ANNIX_ORBIT_RECRUITER_FEATURES];

export const ANNIX_ORBIT_RECRUITER_TIERS = {
  SCOUT: "scout",
  RECRUIT: "recruit",
  LEADER: "leader",
} as const;

export type AnnixOrbitRecruiterTierKey =
  (typeof ANNIX_ORBIT_RECRUITER_TIERS)[keyof typeof ANNIX_ORBIT_RECRUITER_TIERS];

export const ANNIX_ORBIT_RECRUITER_LICENSING: ModuleLicensingDefinition = {
  moduleKey: ANNIX_ORBIT_RECRUITER_MODULE_KEY,
  defaultTier: ANNIX_ORBIT_RECRUITER_TIERS.SCOUT,
  features: [
    {
      key: ANNIX_ORBIT_RECRUITER_FEATURES.CLIENTS,
      label: "Clients & CRM",
      description: "Manage the companies you place into, with contacts and fee terms.",
      category: "Sourcing",
      displayOrder: 0,
    },
    {
      key: ANNIX_ORBIT_RECRUITER_FEATURES.TALENT_POOLS,
      label: "Talent pools",
      description: "Build and reuse pools of candidates across vacancies.",
      category: "Sourcing",
      displayOrder: 1,
    },
    {
      key: ANNIX_ORBIT_RECRUITER_FEATURES.AI_MATCHING,
      label: "AI candidate matching",
      description: "Nix-powered matching of your talent to client vacancies.",
      category: "Sourcing",
      displayOrder: 2,
    },
    {
      key: ANNIX_ORBIT_RECRUITER_FEATURES.SUBMISSIONS,
      label: "Submissions & shortlists",
      description: "Submit candidates to clients and track them through to interview.",
      category: "Placement",
      displayOrder: 3,
    },
    {
      key: ANNIX_ORBIT_RECRUITER_FEATURES.PLACEMENTS,
      label: "Placements tracking",
      description: "Track placements through to start, with fees and guarantees.",
      category: "Placement",
      displayOrder: 4,
    },
    {
      key: ANNIX_ORBIT_RECRUITER_FEATURES.TEAM,
      label: "Multiple recruiters",
      description: "Invite recruiters and assign roles across your agency.",
      category: "Team",
      displayOrder: 5,
    },
    {
      key: ANNIX_ORBIT_RECRUITER_FEATURES.ANALYTICS,
      label: "Recruiter analytics",
      description: "Pipeline, conversion and placement analytics for your desk.",
      category: "Analytics",
      displayOrder: 6,
    },
  ],
  tiers: [
    {
      key: ANNIX_ORBIT_RECRUITER_TIERS.SCOUT,
      name: "Scout",
      description: "Find and pool talent — clients, talent pools and AI matching.",
      rank: 0,
      monthlyPriceCents: 0,
      annualPriceCents: 0,
      includedSeats: 1,
      aiDocAllowance: 0,
      visibility: "public",
      displayOrder: 0,
    },
    {
      key: ANNIX_ORBIT_RECRUITER_TIERS.RECRUIT,
      name: "Recruit",
      description: "Place candidates — adds submissions, shortlists and placement tracking.",
      rank: 1,
      monthlyPriceCents: 250_000,
      annualPriceCents: 2_500_000,
      includedSeats: 3,
      aiDocAllowance: 0,
      visibility: "public",
      displayOrder: 1,
    },
    {
      key: ANNIX_ORBIT_RECRUITER_TIERS.LEADER,
      name: "Leader",
      description: "Run the desk — adds multiple recruiters and full analytics.",
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
    [ANNIX_ORBIT_RECRUITER_TIERS.SCOUT]: [
      ANNIX_ORBIT_RECRUITER_FEATURES.CLIENTS,
      ANNIX_ORBIT_RECRUITER_FEATURES.TALENT_POOLS,
      ANNIX_ORBIT_RECRUITER_FEATURES.AI_MATCHING,
    ],
    [ANNIX_ORBIT_RECRUITER_TIERS.RECRUIT]: [
      ANNIX_ORBIT_RECRUITER_FEATURES.CLIENTS,
      ANNIX_ORBIT_RECRUITER_FEATURES.TALENT_POOLS,
      ANNIX_ORBIT_RECRUITER_FEATURES.AI_MATCHING,
      ANNIX_ORBIT_RECRUITER_FEATURES.SUBMISSIONS,
      ANNIX_ORBIT_RECRUITER_FEATURES.PLACEMENTS,
    ],
    [ANNIX_ORBIT_RECRUITER_TIERS.LEADER]: [
      ANNIX_ORBIT_RECRUITER_FEATURES.CLIENTS,
      ANNIX_ORBIT_RECRUITER_FEATURES.TALENT_POOLS,
      ANNIX_ORBIT_RECRUITER_FEATURES.AI_MATCHING,
      ANNIX_ORBIT_RECRUITER_FEATURES.SUBMISSIONS,
      ANNIX_ORBIT_RECRUITER_FEATURES.PLACEMENTS,
      ANNIX_ORBIT_RECRUITER_FEATURES.TEAM,
      ANNIX_ORBIT_RECRUITER_FEATURES.ANALYTICS,
    ],
  },
};
