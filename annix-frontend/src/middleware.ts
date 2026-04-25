import { type NextRequest, NextResponse } from "next/server";

const AU_INDUSTRIES_HOSTS = new Set(["auind.co.za", "www.auind.co.za"]);
const CANONICAL_HOST = "auind.co.za";
const AU_INDUSTRIES_PREFIX = "/au-industries";
const STATIC_FILE_REGEX =
  /\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot|map|mp4|webm|pdf)$/i;
const ROOT_METADATA_PATHS = new Set(["/robots.txt", "/sitemap.xml"]);

export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host") ?? "";
  const host = hostHeader.toLowerCase().split(":")[0];

  if (!AU_INDUSTRIES_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  if (host === "www.auind.co.za") {
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  const pathname = url.pathname;

  if (STATIC_FILE_REGEX.test(pathname) || ROOT_METADATA_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (pathname === AU_INDUSTRIES_PREFIX || pathname.startsWith(`${AU_INDUSTRIES_PREFIX}/`)) {
    const stripped = pathname.slice(AU_INDUSTRIES_PREFIX.length) || "/";
    url.pathname = stripped;
    return NextResponse.redirect(url, 301);
  }

  url.pathname = pathname === "/" ? AU_INDUSTRIES_PREFIX : `${AU_INDUSTRIES_PREFIX}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/|api/).*)"],
};
