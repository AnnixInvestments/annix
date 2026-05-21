import { join } from "node:path";
import { createHowToLoader } from "@/app/lib/how-to";
import { type AnnixOrbitHowToRole, CV_ASSISTANT_HOW_TO_ROLES } from "./types";

const GUIDES_DIR = join(process.cwd(), "src", "app", "cv-assistant", "how-to", "guides");

const loader = createHowToLoader<AnnixOrbitHowToRole>({
  guidesDir: GUIDES_DIR,
  allRoles: CV_ASSISTANT_HOW_TO_ROLES,
});

export const loadAllGuides = loader.loadAllGuides;
export const loadGuideBySlug = loader.loadGuideBySlug;
export const extractHeadings = loader.extractHeadings;
