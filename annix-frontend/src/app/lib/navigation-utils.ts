export const shouldShowGlobalNavigation = (pathname: string): boolean => {
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

  if (pathname.startsWith("/voice-filter")) {
    return false;
  }

  if (pathname.startsWith("/insights")) {
    return false;
  }

  return true;
};
