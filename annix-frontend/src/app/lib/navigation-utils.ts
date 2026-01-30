export const shouldShowGlobalNavigation = (pathname: string): boolean => {
  if (pathname.includes('/portal/')) {
    return false;
  }

  return true;
};
