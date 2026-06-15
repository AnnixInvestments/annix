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

export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host") ?? "";
  const host = normaliseHost(hostHeader);

  const portal = portalForHost(host);
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

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
