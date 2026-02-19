export const shouldShowGlobalNavigation = (pathname: string): boolean => {
  if (pathname.includes("/portal/")) {
    return false;
  }

  if (pathname.startsWith("/customer/messages") || pathname.startsWith("/supplier/messages")) {
    return false;
  }

  if (pathname.startsWith("/fieldflow") || pathname.startsWith("/annix-rep")) {
    return false;
  }

  return true;
};
