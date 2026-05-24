export const licensingKeys = {
  all: ["licensing"] as const,
  catalog: (moduleKey: string) => [...licensingKeys.all, "catalog", moduleKey] as const,
  adminCatalog: (moduleKey: string) => [...licensingKeys.all, "admin-catalog", moduleKey] as const,
  promoCodes: () => [...licensingKeys.all, "promo-codes"] as const,
  tenants: (moduleKey: string) => [...licensingKeys.all, "tenants", moduleKey] as const,
} as const;
