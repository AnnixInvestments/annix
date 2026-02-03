export const shouldShowGlobalNavigation = (pathname: string): boolean => {
  if (pathname.includes('/portal/')) {
    return false;
  }

  if (pathname.startsWith('/customer/messages') || pathname.startsWith('/supplier/messages')) {
    return false;
  }

  return true;
};
