import type { HowToGuide, HowToGuideFrontmatter } from "@/app/lib/how-to";

export type CvAssistantHowToRole = "viewer" | "recruiter" | "admin";

export const CV_ASSISTANT_HOW_TO_ROLES: readonly CvAssistantHowToRole[] = [
  "viewer",
  "recruiter",
  "admin",
] as const;

export const CV_ASSISTANT_ADMIN_ROLE: CvAssistantHowToRole = "admin";

export type CvAssistantHowToGuide = HowToGuide<CvAssistantHowToRole>;
export type CvAssistantHowToFrontmatter = HowToGuideFrontmatter<CvAssistantHowToRole>;
