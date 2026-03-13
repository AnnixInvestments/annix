import type {
  AuCocStatus,
  CocProcessingStatus,
  DeliveryNoteStatus,
  DeliveryNoteType,
  SupplierCocType,
} from "@/app/lib/api/auRubberApi";

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
  supplierCocs: {
    all: ["rubber", "supplierCocs"] as const,
    list: (filters?: {
      cocType?: SupplierCocType;
      processingStatus?: CocProcessingStatus;
      supplierId?: number;
    }) => [...rubberKeys.supplierCocs.all, "list", filters ?? {}] as const,
    detail: (id: number) => [...rubberKeys.supplierCocs.all, "detail", id] as const,
  },
  deliveryNotes: {
    all: ["rubber", "deliveryNotes"] as const,
    list: (filters?: {
      deliveryNoteType?: DeliveryNoteType;
      status?: DeliveryNoteStatus;
      supplierId?: number;
    }) => [...rubberKeys.deliveryNotes.all, "list", filters ?? {}] as const,
    detail: (id: number) => [...rubberKeys.deliveryNotes.all, "detail", id] as const,
  },
  auCocs: {
    all: ["rubber", "auCocs"] as const,
    list: (filters?: { status?: AuCocStatus; customerId?: number }) =>
      [...rubberKeys.auCocs.all, "list", filters ?? {}] as const,
    detail: (id: number) => [...rubberKeys.auCocs.all, "detail", id] as const,
  },
  qualityTracking: {
    all: ["rubber", "qualityTracking"] as const,
    summary: () => [...rubberKeys.qualityTracking.all, "summary"] as const,
    detail: (compoundCode: string) =>
      [...rubberKeys.qualityTracking.all, "detail", compoundCode] as const,
  },
  pendingAuCocs: {
    all: ["rubber", "pendingAuCocs"] as const,
    list: () => [...rubberKeys.pendingAuCocs.all, "list"] as const,
  },
  qualityAlerts: {
    all: ["rubber", "qualityAlerts"] as const,
    list: () => [...rubberKeys.qualityAlerts.all, "list"] as const,
  },
} as const;
