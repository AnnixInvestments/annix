import {
  canonicalHostFor,
  isAliasHost,
  normaliseHost,
  portalForCode,
  portalForHost,
} from "@annix/product-data/portals";
import { type NextRequest, NextResponse } from "next/server";

const STATIC_FILE_REGEX =
  /\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot|map|mp4|webm|pdf)$/i;
const ROOT_METADATA_PATHS = new Set(["/robots.txt", "/sitemap.xml"]);
const MARKETING_SITE_HOST = portalForCode("marketing").prodHost;

// #395 Phase 1: on path-prefix hosts (launcher hub, localhost, annix-app*.fly.dev)
// the legacy Stock Control / AU Rubber entry + login paths funnel through the
// unified /core login. This is host-gated below — the dedicated stockcontrol /
// aurubber hosts are handled by the strip-and-rewrite block and are left
// untouched, so in-app /stock-control/login links (logout, session-expiry) keep
// resolving to the app login instead of 404-ing on /stock-control/core.
const CORE_ENTRY_REDIRECT_PATHS = new Set([
  "/stock-control",
  "/stock-control/login",
  "/au-rubber",
  "/au-rubber/login",
]);

export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host") ?? "";
  const host = normaliseHost(hostHeader);

  const portal = portalForHost(host);
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // The repo-wide update checker polls this from every host. Never rewrite or
  // redirect it (portal-prefix hosts would otherwise 404 it) so it always
  // resolves to the root /app-build-id route handler.
  if (pathname === "/app-build-id") {
    return NextResponse.next();
  }

  if (portal && isAliasHost(host)) {
    const canonical = canonicalHostFor(host);
    if (canonical) {
      url.host = canonical;
      url.port = "";
      return NextResponse.redirect(url, 301);
    }
  }

  if (portal && portal.internalPathPrefix !== "/") {
    if (pathname.endsWith(".html")) {
      url.pathname = pathname.slice(0, -".html".length) || "/";
      return NextResponse.redirect(url, 301);
    }

    if (STATIC_FILE_REGEX.test(pathname) || ROOT_METADATA_PATHS.has(pathname)) {
      return NextResponse.next();
    }

    const prefix = portal.internalPathPrefix;

    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const stripped = pathname.slice(prefix.length) || "/";
      url.pathname = stripped;
      return NextResponse.redirect(url, 301);
    }

    url.pathname = pathname === "/" ? prefix : `${prefix}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // #395 Phase 1: funnel the legacy SC / AU entry + login paths to /core on
  // path-prefix hosts only (we are past the dedicated-host block above, so
  // `portal` here is marketing or null). The query string is preserved so
  // ?expired=1 and ?returnUrl survive. Loop-guard: never touch /core itself.
  // Admin-transfer links (/stock-control/login?admin-transfer=...) are exempt so
  // they keep reaching the Stock Control login handler that accepts the transfer.
  const isCoreItself = pathname === "/core" || pathname.startsWith("/core/");
  const carriesAdminTransfer = url.searchParams.has("admin-transfer");
  if (!isCoreItself && !carriesAdminTransfer && CORE_ENTRY_REDIRECT_PATHS.has(pathname)) {
    url.pathname = "/core";
    return NextResponse.redirect(url, 301);
  }

  // Root-prefix hosts. The public marketing website lives ONLY on the marketing
  // prod host (annix.co.za); every other host — localhost, annix-app*.fly.dev and
  // any unknown host — serves the Annix launcher hub at "/" instead of the website.
  if (host !== MARKETING_SITE_HOST && pathname === "/") {
    url.pathname = "/portals";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/).*)"],
};
