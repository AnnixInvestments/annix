import type { HowToGuide, HowToGuideFrontmatter } from "@/app/lib/how-to";

/**
 * Orbit how-to audiences. Portal (employer) side: viewer/recruiter/admin.
 * Seeker side: seeker/individual (the individual auth role) + the FuturePath
 * roles student/parent/teacher. One guides dir, role-filtered by the shared
 * index — portal guides stay hidden from seekers and vice versa.
 */
export type AnnixOrbitHowToRole =
  | "viewer"
  | "recruiter"
  | "admin"
  | "seeker"
  | "individual"
  | "student"
  | "parent"
  | "teacher";

export const CV_ASSISTANT_HOW_TO_ROLES: readonly AnnixOrbitHowToRole[] = [
  "viewer",
  "recruiter",
  "admin",
  "seeker",
  "individual",
  "student",
  "parent",
  "teacher",
] as const;

export const CV_ASSISTANT_ADMIN_ROLE: AnnixOrbitHowToRole = "admin";

export type AnnixOrbitHowToGuide = HowToGuide<AnnixOrbitHowToRole>;
export type AnnixOrbitHowToFrontmatter = HowToGuideFrontmatter<AnnixOrbitHowToRole>;
