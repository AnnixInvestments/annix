export const featureFlagKeys = {
  all: ["featureFlags"] as const,
  detailed: () => [...featureFlagKeys.all, "detailed"] as const,
} as const;
