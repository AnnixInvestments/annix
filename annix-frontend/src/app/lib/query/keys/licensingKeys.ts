export const licensingKeys = {
  all: ["licensing"] as const,
  catalog: (moduleKey: string) => [...licensingKeys.all, "catalog", moduleKey] as const,
  adminCatalog: (moduleKey: string) => [...licensingKeys.all, "admin-catalog", moduleKey] as const,
} as const;
