import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { coreShellHref } from "./coreShellRewrite";

/**
 * Returns a stable rewriter that maps a legacy per-app portal href to its
 * in-shell `/core/portal/...` equivalent — but ONLY when rendered inside the
 * shell (pathname under `/core/portal`), and then only for routes that exist
 * in-shell AND whose app has Phase 1 ON (the per-app enablement is enforced
 * inside `coreShellHref`). Everything else (legacy render, non-portal href,
 * unhosted/sub-route target, not-yet-enabled app) is returned byte-for-byte
 * unchanged, so it ejects cleanly to legacy / "Classic".
 *
 * Uses `usePathname()` (SSR-consistent in App Router) rather than
 * `window.location`, so the rewritten href matches between server and client —
 * no pre-hydration eject or hydration warning. Call once at component top:
 * `const coreHref = useCoreAwareHref();` then `coreHref(legacyHref)`.
 */
export function useCoreAwareHref(): (href: string) => string {
  const pathname = usePathname();
  const inShell = pathname.startsWith("/core/portal");
  return useCallback((href: string): string => (inShell ? coreShellHref(href) : href), [inShell]);
}
