import { join } from "node:path";
import { createHowToLoader } from "@/app/lib/how-to";
import { STOCK_CONTROL_HOW_TO_ROLES, type StockControlHowToRole } from "./types";

const GUIDES_DIR = join(process.cwd(), "src", "app", "stock-control", "how-to", "guides");

const loader = createHowToLoader<StockControlHowToRole>({
  guidesDir: GUIDES_DIR,
  allRoles: STOCK_CONTROL_HOW_TO_ROLES,
});

export const loadAllGuides = loader.loadAllGuides;
export const loadGuideBySlug = loader.loadGuideBySlug;
export const extractHeadings = loader.extractHeadings;
