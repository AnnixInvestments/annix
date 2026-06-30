import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { isCorePortalEnabled, isCorePortalHostedSuffix } from "../config/corePortalFlag";

const PORTAL_PREFIX_TO_APP: ReadonlyArray<{ prefix: string; app: string }> = [
  { prefix: "/stock-control/portal/", app: "stock-control" },
  { prefix: "/au-rubber/portal/", app: "au-rubber" },
];

function rewriteForShell(href: string, app: string, prefix: string): string {
  const rest = href.slice(prefix.length);
  const queryIndex = rest.search(/[?#]/);
  const suffixPath = queryIndex === -1 ? rest : rest.slice(0, queryIndex);
  const segments = suffixPath.split("/").filter((segment) => segment.length > 0);
  const firstSegment = segments[0];
  const base = firstSegment ?? "";
  if (!isCorePortalHostedSuffix(base)) {
    return href;
  }
  // Only routes that actually exist in-shell: a hosted list route (1 segment)
  // or its numeric-id detail route (2 segments). Anything deeper or non-numeric
  // (sub-pages like inventory/import, staff/members) ejects to legacy instead of
  // rewriting into a branded not-found.
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

/**
 * Returns a stable rewriter that maps a legacy per-app portal href to its
 * in-shell `/core/portal/...` equivalent — but ONLY when rendered inside the
 * shell with the cutover ON, and ONLY for routes that actually exist in-shell
 * (a hosted list suffix, or its numeric-id detail). Everything else (flag OFF,
 * legacy render, non-portal href, unhosted/sub-route target) is returned
 * byte-for-byte unchanged, so it ejects cleanly to legacy / "Classic".
 *
 * Uses `usePathname()` (SSR-consistent in App Router) rather than
 * `window.location`, so the rewritten href matches between server and client —
 * no pre-hydration eject or hydration warning. Call once at component top:
 * `const coreHref = useCoreAwareHref();` then `coreHref(legacyHref)`.
 */
export function useCoreAwareHref(): (href: string) => string {
  const pathname = usePathname();
  const inShell = isCorePortalEnabled() && pathname.startsWith("/core/portal");
  return useCallback(
    (href: string): string => {
      if (!href) {
        return href;
      }
      if (!inShell) {
        return href;
      }
      const matched = PORTAL_PREFIX_TO_APP.find((entry) => href.startsWith(entry.prefix));
      if (!matched) {
        return href;
      }
      return rewriteForShell(href, matched.app, matched.prefix);
    },
    [inShell],
  );
}
