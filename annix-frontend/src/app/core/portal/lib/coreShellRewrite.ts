import {
  isCorePortalEnabled,
  isCorePortalHostedRouteTemplate,
  isCorePortalHostedSuffix,
  isCorePortalRedirectLegacyEnabled,
} from "../config/corePortalFlag";
import type { CoreApp } from "../config/navAppMap";

/**
 * Pure, edge-safe rewrite core shared by the client `useCoreAwareHref` hook and
 * the middleware legacy-URL redirect. Imports only the pure flag config (the
 * `CoreApp` import is type-only, so no React / navAppMap runtime deps leak into
 * the middleware bundle). Keep it free of `react` / `next/navigation` imports.
 */
export const PORTAL_PREFIX_TO_APP: ReadonlyArray<{ prefix: string; app: CoreApp }> = [
  { prefix: "/stock-control/portal/", app: "stock-control" },
  { prefix: "/au-rubber/portal/", app: "au-rubber" },
];

function rewriteForShell(href: string, app: CoreApp, prefix: string): string {
  const rest = href.slice(prefix.length);
  const queryIndex = rest.search(/[?#]/);
  const suffixPath = queryIndex === -1 ? rest : rest.slice(0, queryIndex);
  if (isCorePortalHostedRouteTemplate(app, suffixPath)) {
    return `/core/portal/${app}/${rest}`;
  }
  const segments = suffixPath.split("/").filter((segment) => segment.length > 0);
  const firstSegment = segments[0];
  const base = firstSegment ?? "";
  if (!isCorePortalHostedSuffix(app, base)) {
    return href;
  }
  if (segments.length === 1) {
    return `/core/portal/${app}/${rest}`;
  }
  if (segments.length === 2) {
    const secondSegment = segments[1];
    const detailId = secondSegment ?? "";
    if (/^\d+$/.test(detailId)) {
      return `/core/portal/${app}/${rest}`;
    }
  }
  return href;
}

/** The app a legacy portal href/pathname belongs to, or null if it is not one. */
export function appForLegacyPath(href: string): CoreApp | null {
  const queryIndex = href.search(/[?#]/);
  const path = queryIndex === -1 ? href : href.slice(0, queryIndex);
  const rootMatch = PORTAL_PREFIX_TO_APP.find((entry) => path === entry.prefix.slice(0, -1));
  if (rootMatch) {
    return rootMatch.app;
  }
  const matched = PORTAL_PREFIX_TO_APP.find((entry) => href.startsWith(entry.prefix));
  if (!matched) {
    return null;
  }
  return matched.app;
}

/**
 * Maps a legacy per-app portal href to its in-shell `/core/portal/...` equivalent
 * for routes that actually exist in-shell (a hosted list suffix, its numeric-id
 * detail, or a hosted nested template), plus the bare app-root → `/dashboard` —
 * but ONLY for apps whose Phase-1 flag is on. Everything else (non-portal href,
 * unhosted/sub-route target, or a not-yet-enabled app) is returned byte-for-byte
 * unchanged so it ejects cleanly to legacy. Does NOT gate on shell context —
 * callers (the hook) apply the `/core/portal` structural gate.
 */
export function coreShellHref(href: string): string {
  if (!href) {
    return href;
  }
  const rootIndex = href.search(/[?#]/);
  const rootPath = rootIndex === -1 ? href : href.slice(0, rootIndex);
  const rootTail = rootIndex === -1 ? "" : href.slice(rootIndex);
  const rootMatch = PORTAL_PREFIX_TO_APP.find((entry) => rootPath === entry.prefix.slice(0, -1));
  if (rootMatch) {
    if (!isCorePortalEnabled(rootMatch.app)) {
      return href;
    }
    return `/core/portal/${rootMatch.app}/dashboard${rootTail}`;
  }
  const matched = PORTAL_PREFIX_TO_APP.find((entry) => href.startsWith(entry.prefix));
  if (!matched || !isCorePortalEnabled(matched.app)) {
    return href;
  }
  return rewriteForShell(href, matched.app, matched.prefix);
}

/**
 * Middleware helper: the in-shell target a legacy pathname should redirect to, or
 * `null` when it must keep serving legacy — because the path is not a hosted
 * portal route, or its app has Phase-1 OFF, or its app has Phase-2 (legacy
 * redirect) OFF. Both per-app gates apply. Pass a bare pathname (no query — the
 * caller re-attaches the original search params on the redirect URL).
 */
export function coreShellRedirectTarget(pathname: string): string | null {
  const app = appForLegacyPath(pathname);
  if (!app || !isCorePortalRedirectLegacyEnabled(app)) {
    return null;
  }
  const rewritten = coreShellHref(pathname);
  return rewritten === pathname ? null : rewritten;
}
