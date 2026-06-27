import { MODULE_CODES, type ModuleCode } from "@/app/ops/config/modules";
import { OPS_NAV_ITEMS } from "@/app/ops/config/navItems";

export type CoreApp = "stock-control" | "au-rubber";

export type NavAppOwner = CoreApp | "shared";

/**
 * Maps each existing ops nav item id to the `/core/portal` app that owns it.
 * Derived from `OPS_NAV_ITEMS` (we never edit navItems.ts). The rubber group
 * belongs to AU Rubber; cross-app surfaces (dashboard, contacts, settings)
 * are "shared" and render for whichever app is active.
 */
const RUBBER_NAV_KEYS: ReadonlySet<string> = new Set([
  "compound-stock",
  "roll-stock",
  "production",
  "supplier-cocs",
  "au-cocs",
]);

const SHARED_NAV_KEYS: ReadonlySet<string> = new Set([
  "dashboard",
  "suppliers",
  "customers",
  "settings",
]);

export function navAppOwner(navKey: string): NavAppOwner {
  if (SHARED_NAV_KEYS.has(navKey)) {
    return "shared";
  }
  if (RUBBER_NAV_KEYS.has(navKey)) {
    return "au-rubber";
  }
  return "stock-control";
}

export function navItemBelongsToApp(navKey: string, activeApp: CoreApp): boolean {
  const owner = navAppOwner(navKey);
  return owner === "shared" || owner === activeApp;
}

/**
 * AU Rubber has no `/platform/companies/{id}/modules` endpoint (backend is
 * frozen). The shell drives AU nav from this static rubber-domain module set
 * derived from `MODULE_CODES`, instead of a network fetch.
 */
export const AU_RUBBER_STATIC_MODULES: ModuleCode[] = [
  MODULE_CODES.RUBBER_PRODUCTION,
  MODULE_CODES.RUBBER_COCS,
  MODULE_CODES.QUALITY,
];

export const NAV_APP_OWNER_BY_KEY: Readonly<Record<string, NavAppOwner>> = Object.fromEntries(
  OPS_NAV_ITEMS.map((item) => [item.key, navAppOwner(item.key)]),
);
