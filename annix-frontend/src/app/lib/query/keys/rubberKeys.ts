import type {
  AuCocStatus,
  CocProcessingStatus,
  DeliveryNoteStatus,
  DeliveryNoteType,
  SupplierCocType,
} from "@/app/lib/api/auRubberApi";
import type { CostRateType } from "@/app/lib/api/rubberPortalApi";

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
  specifications: {
    all: ["rubber", "specifications"] as const,
    list: () => [...rubberKeys.specifications.all, "list"] as const,
  },
  websitePages: {
    all: ["rubber", "websitePages"] as const,
    list: () => [...rubberKeys.websitePages.all, "list"] as const,
    detail: (id: string) => [...rubberKeys.websitePages.all, "detail", id] as const,
  },
  costRates: {
    all: ["rubber", "costRates"] as const,
    list: (rateType?: CostRateType) =>
      [...rubberKeys.costRates.all, "list", rateType ?? null] as const,
  },
  accessUsers: {
    all: ["rubber", "accessUsers"] as const,
    list: () => [...rubberKeys.accessUsers.all, "list"] as const,
  },
  accessRoles: {
    all: ["rubber", "accessRoles"] as const,
    list: () => [...rubberKeys.accessRoles.all, "list"] as const,
  },
  accessPermissions: {
    all: ["rubber", "accessPermissions"] as const,
    list: () => [...rubberKeys.accessPermissions.all, "list"] as const,
  },
  featureFlags: {
    all: ["rubber", "featureFlags"] as const,
    list: () => [...rubberKeys.featureFlags.all, "list"] as const,
  },
  calendererRates: {
    all: ["rubber", "calendererRates"] as const,
    list: () => [...rubberKeys.calendererRates.all, "list"] as const,
  },
  rollCos: {
    all: ["rubber", "rollCos"] as const,
    list: (status?: string) => [...rubberKeys.rollCos.all, "list", status ?? null] as const,
    detail: (id: number) => [...rubberKeys.rollCos.all, "detail", id] as const,
  },
} as const;
