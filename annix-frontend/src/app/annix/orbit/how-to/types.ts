import type { HowToGuide, HowToGuideFrontmatter } from "@/app/lib/how-to";

export type AnnixOrbitHowToRole = "viewer" | "recruiter" | "admin";

export const CV_ASSISTANT_HOW_TO_ROLES: readonly AnnixOrbitHowToRole[] = [
  "viewer",
  "recruiter",
  "admin",
] as const;

export const CV_ASSISTANT_ADMIN_ROLE: AnnixOrbitHowToRole = "admin";

export type AnnixOrbitHowToGuide = HowToGuide<AnnixOrbitHowToRole>;
export type AnnixOrbitHowToFrontmatter = HowToGuideFrontmatter<AnnixOrbitHowToRole>;
