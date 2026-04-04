export const featureFlagKeys = {
  all: ["featureFlags"] as const,
  public: () => [...featureFlagKeys.all, "public"] as const,
  detailed: () => [...featureFlagKeys.all, "detailed"] as const,
} as const;
