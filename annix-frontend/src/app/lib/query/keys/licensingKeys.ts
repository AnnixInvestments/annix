export const licensingKeys = {
  all: ["licensing"] as const,
  catalog: (moduleKey: string) => [...licensingKeys.all, "catalog", moduleKey] as const,
} as const;
