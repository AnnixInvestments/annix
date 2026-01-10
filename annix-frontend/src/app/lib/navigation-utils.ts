export const shouldShowGlobalNavigation = (pathname: string): boolean => {
  if (pathname.includes('/portal/')) {
    return false;
  }

  if (pathname.includes('/login') || pathname.includes('/register')) {
    return false;
  }

  return true;
};
