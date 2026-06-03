import type { ModuleLicensingDefinition } from "../../licensing";

// Scaffold only — the Student (FuturePath) module is not built yet. These tier
// names lock in the naming so the catalog/admin are ready when the module lands.
export const ANNIX_ORBIT_STUDENT_MODULE_KEY = "annix-orbit-student";

export const ANNIX_ORBIT_STUDENT_FEATURES = {
  FUTUREPATH: "FUTUREPATH",
  SUBJECT_TRACKING: "SUBJECT_TRACKING",
  QUALIFICATION_EXPLORER: "QUALIFICATION_EXPLORER",
  MENTOR: "MENTOR",
  APPLICATIONS: "APPLICATIONS",
} as const;

export type AnnixOrbitStudentFeatureKey =
  (typeof ANNIX_ORBIT_STUDENT_FEATURES)[keyof typeof ANNIX_ORBIT_STUDENT_FEATURES];

export const ANNIX_ORBIT_STUDENT_TIERS = {
  DISCOVER: "discover",
  PREPARE: "prepare",
  ACHIEVE: "achieve",
} as const;

export type AnnixOrbitStudentTierKey =
  (typeof ANNIX_ORBIT_STUDENT_TIERS)[keyof typeof ANNIX_ORBIT_STUDENT_TIERS];

export const ANNIX_ORBIT_STUDENT_LICENSING: ModuleLicensingDefinition = {
  moduleKey: ANNIX_ORBIT_STUDENT_MODULE_KEY,
  defaultTier: ANNIX_ORBIT_STUDENT_TIERS.DISCOVER,
  features: [
    {
      key: ANNIX_ORBIT_STUDENT_FEATURES.FUTUREPATH,
      label: "FuturePath planning",
      description: "Plan subjects and marks toward the qualification you want.",
      category: "Planning",
      displayOrder: 0,
    },
    {
      key: ANNIX_ORBIT_STUDENT_FEATURES.SUBJECT_TRACKING,
      label: "Subject & marks tracking",
      description: "Track your subjects and results over time.",
      category: "Planning",
      displayOrder: 1,
    },
    {
      key: ANNIX_ORBIT_STUDENT_FEATURES.QUALIFICATION_EXPLORER,
      label: "Qualification explorer",
      description: "Explore qualifications and the marks they require.",
      category: "Planning",
      displayOrder: 2,
    },
    {
      key: ANNIX_ORBIT_STUDENT_FEATURES.MENTOR,
      label: "AI study mentor",
      description: "Ask Nix for guidance on subjects, study and options.",
      category: "Guidance",
      displayOrder: 3,
    },
    {
      key: ANNIX_ORBIT_STUDENT_FEATURES.APPLICATIONS,
      label: "Application tracking",
      description: "Track tertiary and bursary applications.",
      category: "Guidance",
      displayOrder: 4,
    },
  ],
  tiers: [
    {
      key: ANNIX_ORBIT_STUDENT_TIERS.DISCOVER,
      name: "Discover",
      description: "Plan your path — subjects, marks and qualification explorer.",
      rank: 0,
      monthlyPriceCents: 0,
      annualPriceCents: 0,
      includedSeats: 1,
      aiDocAllowance: 0,
      visibility: "public",
      displayOrder: 0,
    },
    {
      key: ANNIX_ORBIT_STUDENT_TIERS.PREPARE,
      name: "Prepare",
      description: "Get guidance — adds the AI study mentor.",
      rank: 1,
      monthlyPriceCents: 0,
      annualPriceCents: 0,
      includedSeats: 1,
      aiDocAllowance: 0,
      visibility: "public",
      displayOrder: 1,
    },
    {
      key: ANNIX_ORBIT_STUDENT_TIERS.ACHIEVE,
      name: "Achieve",
      description: "Apply with confidence — adds application tracking.",
      rank: 2,
      monthlyPriceCents: 0,
      annualPriceCents: 0,
      includedSeats: 1,
      aiDocAllowance: 0,
      visibility: "public",
      displayOrder: 2,
    },
  ],
  tierFeatures: {
    [ANNIX_ORBIT_STUDENT_TIERS.DISCOVER]: [
      ANNIX_ORBIT_STUDENT_FEATURES.FUTUREPATH,
      ANNIX_ORBIT_STUDENT_FEATURES.SUBJECT_TRACKING,
      ANNIX_ORBIT_STUDENT_FEATURES.QUALIFICATION_EXPLORER,
    ],
    [ANNIX_ORBIT_STUDENT_TIERS.PREPARE]: [
      ANNIX_ORBIT_STUDENT_FEATURES.FUTUREPATH,
      ANNIX_ORBIT_STUDENT_FEATURES.SUBJECT_TRACKING,
      ANNIX_ORBIT_STUDENT_FEATURES.QUALIFICATION_EXPLORER,
      ANNIX_ORBIT_STUDENT_FEATURES.MENTOR,
    ],
    [ANNIX_ORBIT_STUDENT_TIERS.ACHIEVE]: [
      ANNIX_ORBIT_STUDENT_FEATURES.FUTUREPATH,
      ANNIX_ORBIT_STUDENT_FEATURES.SUBJECT_TRACKING,
      ANNIX_ORBIT_STUDENT_FEATURES.QUALIFICATION_EXPLORER,
      ANNIX_ORBIT_STUDENT_FEATURES.MENTOR,
      ANNIX_ORBIT_STUDENT_FEATURES.APPLICATIONS,
    ],
  },
};
