export const sourcingKeys = {
  all: ["rfq", "sourcing"] as const,
  plan: (sessionId: number) => ["rfq", "sourcing", "plan", sessionId] as const,
} as const;
