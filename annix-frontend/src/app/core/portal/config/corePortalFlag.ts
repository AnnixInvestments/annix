import type { CoreApp } from "./navAppMap";

const ENV_FLAG = process.env.NEXT_PUBLIC_CORE_PORTAL_ENABLED;

/**
 * Master switch for the #395 unified `/core/portal` cutover — option (b) hybrid.
 *
 * DEFAULT OFF: with the flag off, login routes to the legacy
 * `/<app>/portal/dashboard` and nothing about today's behaviour changes. Flip
 * by setting `NEXT_PUBLIC_CORE_PORTAL_ENABLED=true` at build time (a deliberate,
 * reversible per-environment switch — same build-time-constant style as
 * `stock-control/config/rbacMode.ts`).
 *
 * When ON: `CoreLoginForm` routes INTO the shell (`/core/portal/<app>/dashboard`)
 * and the shell's sidebar links hosted routes in-shell while linking every
 * not-yet-migrated route at the EXISTING legacy `/<app>/portal/<suffix>` page
 * (the hybrid — no page migration required).
 */
export const CORE_PORTAL_ENABLED: boolean = ENV_FLAG === "true";

export function isCorePortalEnabled(): boolean {
  return CORE_PORTAL_ENABLED;
}

/**
 * Path suffixes physically hosted under `/core/portal/<app>/...` today, KEYED BY
 * APP. Anything outside an app's set links to that app's legacy
 * `/<app>/portal/<suffix>` page when the cutover is ON. Keying by app prevents
 * cross-app suffix collisions (e.g. AU `settings` vs SC `settings`). Grow each
 * app's set as its pages migrate into the shell.
 */
export const CORE_PORTAL_HOSTED_SUFFIXES_BY_APP: Record<CoreApp, ReadonlySet<string>> = {
  "stock-control": new Set([
    "dashboard",
    "inventory",
    "job-cards",
    "customer-deliveries",
    "invoices",
    "purchase-orders",
    "deliveries",
    "settings",
  ]),
  "au-rubber": new Set([
    "dashboard",
    "products",
    "compound-stocks",
    "orders",
    "au-cocs",
    "supplier-cocs",
    "roll-stock",
    "productions",
  ]),
};

export function isCorePortalHostedSuffix(app: CoreApp, suffix: string): boolean {
  const hostedForApp = CORE_PORTAL_HOSTED_SUFFIXES_BY_APP[app];
  return hostedForApp.has(suffix);
}
