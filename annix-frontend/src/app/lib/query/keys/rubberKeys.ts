export const rubberKeys = {
  orders: {
    all: ["rubber", "orders"] as const,
    list: (status?: number) => [...rubberKeys.orders.all, "list", status ?? null] as const,
    detail: (id: number) => [...rubberKeys.orders.all, "detail", id] as const,
  },
  companies: {
    all: ["rubber", "companies"] as const,
    list: () => [...rubberKeys.companies.all, "list"] as const,
  },
  products: {
    all: ["rubber", "products"] as const,
    list: () => [...rubberKeys.products.all, "list"] as const,
    detail: (id: number) => [...rubberKeys.products.all, "detail", id] as const,
  },
  codings: {
    all: ["rubber", "codings"] as const,
    list: (codingType?: string) => [...rubberKeys.codings.all, "list", codingType ?? null] as const,
  },
  pricingTiers: {
    all: ["rubber", "pricingTiers"] as const,
    list: () => [...rubberKeys.pricingTiers.all, "list"] as const,
  },
  statuses: {
    all: ["rubber", "statuses"] as const,
    list: () => [...rubberKeys.statuses.all, "list"] as const,
  },
} as const;
