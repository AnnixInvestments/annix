import {
  canonicalHostFor,
  isAliasHost,
  normaliseHost,
  portalForHost,
} from "@annix/product-data/portals";
import { type NextRequest, NextResponse } from "next/server";

const STATIC_FILE_REGEX =
  /\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot|map|mp4|webm|pdf)$/i;
const ROOT_METADATA_PATHS = new Set(["/robots.txt", "/sitemap.xml"]);

export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host") ?? "";
  const host = normaliseHost(hostHeader);

  const portal = portalForHost(host);
  if (!portal) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  if (isAliasHost(host)) {
    const canonical = canonicalHostFor(host);
    if (canonical) {
      url.host = canonical;
      url.port = "";
      return NextResponse.redirect(url, 301);
    }
  }

  if (portal.internalPathPrefix === "/") {
    return NextResponse.next();
  }

  const pathname = url.pathname;

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

export const config = {
  matcher: ["/((?!_next/|api/).*)"],
};
