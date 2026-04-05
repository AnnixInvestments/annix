import type { HowToGuide, HowToGuideFrontmatter } from "@/app/lib/how-to";

export type StockControlHowToRole =
  | "viewer"
  | "quality"
  | "storeman"
  | "accounts"
  | "manager"
  | "admin";

export const STOCK_CONTROL_HOW_TO_ROLES: readonly StockControlHowToRole[] = [
  "viewer",
  "quality",
  "storeman",
  "accounts",
  "manager",
  "admin",
] as const;

export const STOCK_CONTROL_ADMIN_ROLE: StockControlHowToRole = "admin";

export type StockControlHowToGuide = HowToGuide<StockControlHowToRole>;
export type StockControlHowToFrontmatter = HowToGuideFrontmatter<StockControlHowToRole>;
