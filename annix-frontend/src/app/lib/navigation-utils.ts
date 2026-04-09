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

  if (pathname.startsWith("/voice-filter")) {
    return false;
  }

  return true;
};
