import type { CoreApp } from "./navAppMap";

const ALL_CORE_APPS: readonly CoreApp[] = ["stock-control", "au-rubber"];

/**
 * Parse a PER-APP build-time flag into the set of apps it enables. Accepts a
 * comma-separated app list (`"stock-control"`, `"stock-control,au-rubber"`) so
 * each app can flip independently and soak on its own timeline; `"true"` / `"all"`
 * are a convenience meaning every app. Unknown tokens are ignored. Empty/unset →
 * no apps (default OFF). Build-time `NEXT_PUBLIC_*` constant, so a change needs a
 * rebuild+redeploy, not a runtime toggle.
 */
function parseEnabledApps(raw: string | undefined): ReadonlySet<CoreApp> {
  if (!raw) {
    return new Set();
  }
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "true" || trimmed === "all") {
    return new Set(ALL_CORE_APPS);
  }
  const requested = trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return new Set(ALL_CORE_APPS.filter((app) => requested.includes(app)));
}

/**
 * #395 unified `/core/portal` cutover — Phase 1, PER APP. DEFAULT OFF: with an
 * app absent from the set, its login routes to the legacy
 * `/<app>/portal/dashboard` and nothing changes for it. Enable per app via
 * `NEXT_PUBLIC_CORE_PORTAL_ENABLED` (e.g. `stock-control` to flip Stock Control
 * while AU Rubber stays legacy), so each app soaks independently. When on for an
 * app, `CoreLoginForm` routes it INTO the shell and the shell links its hosted
 * routes in-shell.
 */
const CORE_PORTAL_ENABLED_APPS = parseEnabledApps(process.env.NEXT_PUBLIC_CORE_PORTAL_ENABLED);

export function isCorePortalEnabled(app: CoreApp): boolean {
  return CORE_PORTAL_ENABLED_APPS.has(app);
}

/**
 * #395 Phase 2 switch — legacy deep-URL redirect, PER APP. SEPARATE from Phase 1
 * on purpose: Phase 1 flips an app's shell ON while its legacy `/<app>/portal/*`
 * URLs keep serving (with a "go to new portal" signpost) so it can soak with a
 * working fallback; only once soaked do we add THIS app to the redirect set and
 * the middleware 307-redirects its legacy deep URLs into the shell to retire
 * them. DEFAULT OFF per app, and a strict no-op for an app unless Phase 1 is also
 * on for it. Reversible: drop the app and its legacy URLs serve legacy again
 * (307, not cached).
 */
const CORE_PORTAL_REDIRECT_LEGACY_APPS = parseEnabledApps(
  process.env.NEXT_PUBLIC_CORE_PORTAL_REDIRECT_LEGACY,
);

export function isCorePortalRedirectLegacyEnabled(app: CoreApp): boolean {
  return CORE_PORTAL_REDIRECT_LEGACY_APPS.has(app);
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
    "requisitions",
    "grns",
    "supplier-purchase-orders",
    "supplier-scorecard",
    "supplier-documents",
    "customer-invoices",
    "customer-scorecard",
    "customer-documents",
    "quotations",
    "quality",
    "admin",
    "how-to",
    "reports",
    "glossary",
    "rubber-quote",
    "quote",
    "stock",
    "supplier",
    "customer",
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
  "stock-control": new Set([
    "quotations/new-from-documents",
    "quotations/drafts/*",
    "quotations/quotes/*",
    "quotations/quotes/*/preview",
    "quality/*",
    "quality/positector/*",
    "inventory/import",
    "inventory/reconcile",
    "inventory/identify",
    "admin/*",
    "staff/*",
    "how-to/*",
    "library/mines",
    "library/mines/*",
    "library/documents/*",
    "preview/stock-management",
    "preview/stock-management/*",
    "preview/stock-management/admin/*",
  ]),
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
