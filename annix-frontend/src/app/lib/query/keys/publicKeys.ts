export const publicKeys = {
  all: ["public"] as const,
  stats: () => [...publicKeys.all, "stats"] as const,
} as const;
