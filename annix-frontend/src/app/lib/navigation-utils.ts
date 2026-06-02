// Login / auth chooser screens are pre-auth and have no app toolbar of their
// own, so they always get the global Annix nav — even inside app namespaces
// (orbit, au-rubber, stock-control, annix-rep, sentinel) that otherwise
// suppress it to avoid double-toolbars on their inner pages.
export const isLoginScreen = (pathname: string): boolean => {
  return (
    pathname.endsWith("/login") || pathname.includes("/auth/login") || pathname === "/annix/orbit"
  );
};

export const shouldShowGlobalNavigation = (pathname: string): boolean => {
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
