import { join } from "node:path";
import { createHowToLoader } from "@/app/lib/how-to";
import { CV_ASSISTANT_HOW_TO_ROLES, type CvAssistantHowToRole } from "./types";

const GUIDES_DIR = join(process.cwd(), "src", "app", "cv-assistant", "how-to", "guides");

const loader = createHowToLoader<CvAssistantHowToRole>({
  guidesDir: GUIDES_DIR,
  allRoles: CV_ASSISTANT_HOW_TO_ROLES,
});

export const loadAllGuides = loader.loadAllGuides;
export const loadGuideBySlug = loader.loadGuideBySlug;
export const extractHeadings = loader.extractHeadings;
