import { isCorePortalEnabled } from "../config/corePortalFlag";

const PORTAL_PREFIX_TO_APP: ReadonlyArray<{ prefix: string; app: string }> = [
  { prefix: "/stock-control/portal/", app: "stock-control" },
  { prefix: "/au-rubber/portal/", app: "au-rubber" },
];

/**
 * Rewrites a legacy per-app portal href to its in-shell `/core/portal/...`
 * equivalent ONLY when rendered inside the unified shell with the cutover ON.
 * Otherwise returns the href byte-for-byte unchanged — so a re-exported page
 * rendered at its legacy `/stock-control/portal/*` URL, and every render while
 * the flag is OFF, behaves exactly as today. Query/hash are preserved (they sit
 * in the `rest` slice). Non-portal hrefs pass through untouched.
 */
export function coreAwareHref(href: string): string {
  if (!href) {
    return href;
  }
  if (!isCorePortalEnabled()) {
    return href;
  }
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") {
    return href;
  }
  const currentPath = window.location.pathname;
  if (!currentPath.startsWith("/core/portal")) {
    return href;
  }
  const matched = PORTAL_PREFIX_TO_APP.find((entry) => href.startsWith(entry.prefix));
  if (!matched) {
    return href;
  }
  const rest = href.slice(matched.prefix.length);
  return `/core/portal/${matched.app}/${rest}`;
}
