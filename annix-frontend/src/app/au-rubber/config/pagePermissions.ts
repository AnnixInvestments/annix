export const PAGE_PERMISSIONS: Record<string, string> = {
  "/au-rubber/portal/dashboard": "dashboard:view",
  "/au-rubber/portal/orders": "orders:view",
  "/au-rubber/portal/products": "products:view",
  "/au-rubber/portal/codings": "codings:view",
  "/au-rubber/portal/supplier-cocs": "supplier-cocs:view",
  "/au-rubber/portal/delivery-notes": "delivery-notes:view",
  "/au-rubber/portal/roll-stock": "roll-stock:view",
  "/au-rubber/portal/au-cocs": "au-cocs:view",
  "/au-rubber/portal/quality-tracking": "quality-tracking:view",
  "/au-rubber/portal/compound-stocks": "compound-stocks:view",
  "/au-rubber/portal/compound-orders": "compound-orders:view",
  "/au-rubber/portal/productions": "productions:view",
  "/au-rubber/portal/stock-movements": "stock-movements:view",
  "/au-rubber/portal/stock-locations": "stock-locations:view",
  "/au-rubber/portal/purchase-requisitions": "purchase-requisitions:view",
  "/au-rubber/portal/pricing-tiers": "pricing-tiers:view",
  "/au-rubber/portal/companies": "companies:view",
  "/au-rubber/portal/settings": "settings:manage",
};

export function permissionForPath(pathname: string): string | null {
  const exactMatch = PAGE_PERMISSIONS[pathname];
  if (exactMatch) {
    return exactMatch;
  }

  const matchingKey = Object.keys(PAGE_PERMISSIONS).find((key) => pathname.startsWith(`${key}/`));
  return matchingKey ? PAGE_PERMISSIONS[matchingKey] : null;
}
