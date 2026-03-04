import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/stock-control/lite/verify-email") {
    const userAgent = request.headers.get("user-agent") || "";

    const iphoneMatch = userAgent.match(/iPhone OS (\d+)_/);
    const ipadMatch = userAgent.match(/CPU OS (\d+)_/);
    const iosMatch = iphoneMatch || ipadMatch;
    const isLegacyiOS = iosMatch && parseInt(iosMatch[1], 10) <= 12;

    const safariMatch = userAgent.match(/Version\/(\d+)/);
    const isLegacySafari = safariMatch && parseInt(safariMatch[1], 10) <= 12;

    if (isLegacyiOS || isLegacySafari) {
      const token = request.nextUrl.searchParams.get("token");
      const apiUrl = new URL("/api/stock-control/lite/verify-email", request.url);
      if (token) {
        apiUrl.searchParams.set("token", token);
      }
      return NextResponse.redirect(apiUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/stock-control/lite/verify-email"],
};
