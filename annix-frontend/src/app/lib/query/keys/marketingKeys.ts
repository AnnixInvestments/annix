export const marketingKeys = {
  all: ["marketing"] as const,
  draft: () => [...marketingKeys.all, "draft"] as const,
  status: () => [...marketingKeys.all, "status"] as const,
} as const;
