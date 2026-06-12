import { join } from "node:path";
import {
  type AnnixOrbitHowToRole,
  CV_ASSISTANT_HOW_TO_ROLES,
} from "@/app/annix/orbit/how-to/types";
import { createHowToLoader } from "@/app/lib/how-to";

const GUIDES_DIR = join(
  process.cwd(),
  "src",
  "app",
  "annix",
  "orbit",
  "recruiter",
  "how-to",
  "guides",
);

const loader = createHowToLoader<AnnixOrbitHowToRole>({
  guidesDir: GUIDES_DIR,
  allRoles: CV_ASSISTANT_HOW_TO_ROLES,
});

export const loadAllGuides = loader.loadAllGuides;
export const loadGuideBySlug = loader.loadGuideBySlug;
export const extractHeadings = loader.extractHeadings;
