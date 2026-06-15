// Login / auth chooser screens are pre-auth and have no app toolbar of their
// own, so they always get the global Annix nav — even inside app namespaces
// (orbit, au-rubber, stock-control, annix-rep, sentinel) that otherwise
// suppress it to avoid double-toolbars on their inner pages.
export const isLoginScreen = (pathname: string): boolean => {
  return (
    pathname.endsWith("/login") || pathname.includes("/auth/login") || pathname === "/annix/orbit"
  );
};

// The public CMS marketing site (annix.co.za) renders its own MarketingNav /
// footer via MarketingShell, so the global Annix nav must never sit on top of
// it. These are the marketing site's own routes — the launcher hub lives at
// /portals and keeps the global nav.
const MARKETING_SITE_PREFIXES = [
  "/products",
  "/industries",
  "/resources",
  "/contact",
  "/about",
  "/labs",
];

export const isMarketingSiteRoute = (pathname: string): boolean => {
  if (pathname === "/") {
    return true;
  }
  return MARKETING_SITE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
};

export const shouldShowGlobalNavigation = (pathname: string): boolean => {
  if (isMarketingSiteRoute(pathname)) {
    return false;
  }

  if (isLoginScreen(pathname)) {
    return true;
  }

  if (pathname.includes("/portal/")) {
    return false;
  }

  if (pathname.startsWith("/customer/messages") || pathname.startsWith("/supplier/messages")) {
    return false;
  }

  if (pathname.startsWith("/annix-rep")) {
    return false;
  }

  if (
    pathname.startsWith("/au-rubber") ||
    pathname.startsWith("/au-industries") ||
    pathname.startsWith("/stock-control")
  ) {
    return false;
  }

  // The entire Annix Orbit app has its own PortalToolbar / standalone headers —
  // never overlay the global marketing nav on top of it (was causing a double
  // toolbar on seeker pages, and would on any other orbit route).
  if (pathname.startsWith("/annix/orbit")) {
    return false;
  }

  if (pathname.startsWith("/insights")) {
    return false;
  }

  return true;
};
