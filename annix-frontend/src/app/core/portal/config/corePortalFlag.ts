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
    "compound-orders",
    "stock-movements",
    "stock-locations",
    "purchase-requisitions",
    "other-items",
    "codings",
    "pricing-tiers",
    "quality-tracking",
  ]),
};

export function isCorePortalHostedSuffix(app: CoreApp, suffix: string): boolean {
  const hostedForApp = CORE_PORTAL_HOSTED_SUFFIXES_BY_APP[app];
  return hostedForApp.has(suffix);
}

/**
 * Multi-segment routes physically hosted under `/core/portal/<app>/...`, keyed by
 * app and expressed as normalized templates (numeric id segments written as
 * `:id`). Some apps (AU Rubber) have genuinely nested sub-routes — document and
 * accounting sections like `companies/suppliers/statements` or
 * `delivery-notes/scan` — that the single-segment `CORE_PORTAL_HOSTED_SUFFIXES`
 * model can't express. A path whose numeric-normalized form is in this set is
 * hosted in-shell; anything else falls through to the single-segment rules.
 *
 * Stock Control has no nested hosted routes today, so its set is empty and its
 * rewrite behaviour is unchanged.
 */
export const CORE_PORTAL_HOSTED_ROUTE_TEMPLATES_BY_APP: Record<CoreApp, ReadonlySet<string>> = {
  "stock-control": new Set([]),
  "au-rubber": new Set([
    "delivery-notes/:id",
    "delivery-notes/suppliers",
    "delivery-notes/customers",
    "delivery-notes/scan",
    "tax-invoices/:id",
    "tax-invoices/suppliers",
    "tax-invoices/customers",
    "companies",
    "companies/suppliers",
    "companies/customers",
    "companies/suppliers/statements",
    "companies/customers/statements",
    "accounting",
    "accounting/payable",
    "accounting/receivable",
    "accounting/reconciliation",
    "accounting/reconciliation/:id",
    "accounting/directors",
    "accounting/history",
    "quality-tracking/*",
  ]),
};

function matchesRouteTemplate(segments: string[], template: string): boolean {
  const templateSegments = template.split("/").filter((segment) => segment.length > 0);
  if (segments.length !== templateSegments.length) {
    return false;
  }
  return templateSegments.every((templateSegment, index) => {
    const segment = segments[index];
    if (templateSegment === "*") {
      return segment.length > 0;
    }
    if (templateSegment === ":id") {
      return /^\d+$/.test(segment);
    }
    return templateSegment === segment;
  });
}

export function isCorePortalHostedRouteTemplate(app: CoreApp, suffixPath: string): boolean {
  const templatesForApp = CORE_PORTAL_HOSTED_ROUTE_TEMPLATES_BY_APP[app];
  const segments = suffixPath.split("/").filter((segment) => segment.length > 0);
  return [...templatesForApp].some((template) => matchesRouteTemplate(segments, template));
}
