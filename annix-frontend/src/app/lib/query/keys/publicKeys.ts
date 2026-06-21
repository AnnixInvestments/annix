export const publicKeys = {
  all: ["public"] as const,
  stats: () => [...publicKeys.all, "stats"] as const,
  inspectionBooking: (token: string) => [...publicKeys.all, "inspection-booking", token] as const,
} as const;
