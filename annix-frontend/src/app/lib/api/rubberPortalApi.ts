import type { CalloffStatus } from "@annix/product-data/rubber/calloffStatus";
import type { StatusHistoryEvent } from "@annix/product-data/rubber/orderStatus";
import { API_BASE_URL } from "@/lib/api-config";

export interface RubberProductCodingDto {
  id: number;
  firebaseUid: string;
  codingType: "COLOUR" | "COMPOUND" | "CURING_METHOD" | "GRADE" | "HARDNESS" | "TYPE";
  code: string;
  name: string;
}

export interface RubberPricingTierDto {
  id: number;
  name: string;
  pricingFactor: number;
}

export type CompanyType = "CUSTOMER" | "SUPPLIER";

export interface RubberCompanyDto {
  id: number;
  firebaseUid: string;
  name: string;
  companyType: CompanyType;
  code: string | null;
  pricingTierId: number | null;
  pricingTierName: string | null;
  pricingFactor: number | null;
  availableProducts: string[];
  isCompoundOwner: boolean;
  vatNumber: string | null;
  registrationNumber: string | null;
  address: Record<string, string> | null;
  notes: string | null;
}

export interface RubberProductDto {
  id: number;
  firebaseUid: string;
  title: string | null;
  description: string | null;
  specificGravity: number | null;
  compoundOwnerName: string | null;
  compoundOwnerFirebaseUid: string | null;
  compoundName: string | null;
  compoundFirebaseUid: string | null;
  typeName: string | null;
  typeFirebaseUid: string | null;
  costPerKg: number | null;
  colourName: string | null;
  colourFirebaseUid: string | null;
  hardnessName: string | null;
  hardnessFirebaseUid: string | null;
  curingMethodName: string | null;
  curingMethodFirebaseUid: string | null;
  gradeName: string | null;
  gradeFirebaseUid: string | null;
  markup: number | null;
  pricePerKg: number | null;
}

export interface CreateRubberProductDto {
  title?: string;
  description?: string;
  specificGravity?: number;
  compoundOwnerFirebaseUid?: string;
  compoundFirebaseUid?: string;
  typeFirebaseUid?: string;
  costPerKg?: number;
  colourFirebaseUid?: string;
  hardnessFirebaseUid?: string;
  curingMethodFirebaseUid?: string;
  gradeFirebaseUid?: string;
  markup?: number;
}

export interface CallOffEvent {
  timestamp: number;
  status: CalloffStatus;
  createdBy?: string;
  notes?: string;
}

export interface CallOff {
  quantity: number;
  quantityRemaining: number;
  events: CallOffEvent[];
  notes?: string;
  createdBy?: string;
  createdAt?: number;
}

export interface RubberOrderItemDto {
  id: number;
  productId: number | null;
  productTitle: string | null;
  thickness: number | null;
  width: number | null;
  length: number | null;
  quantity: number | null;
  callOffs: CallOff[];
  kgPerRoll: number | null;
  totalKg: number | null;
}

export interface RubberOrderDto {
  id: number;
  orderNumber: string;
  companyOrderNumber: string | null;
  status: number;
  statusLabel: string;
  companyId: number | null;
  companyName: string | null;
  items: RubberOrderItemDto[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  statusHistory: StatusHistoryEvent[];
}

export interface RubberPriceCalculationDto {
  productTitle: string | null;
  companyName: string | null;
  specificGravity: number;
  costPerKg: number;
  markup: number;
  pricePerKg: number;
  pricingFactor: number;
  salePricePerKg: number;
  kgPerRoll: number;
  totalKg: number;
  totalPrice: number;
}

export interface ImportProductRowDto {
  title?: string;
  description?: string;
  type?: string;
  compound?: string;
  colour?: string;
  hardness?: string;
  grade?: string;
  curingMethod?: string;
  compoundOwner?: string;
  specificGravity?: number;
  costPerKg?: number;
  markup?: number;
  firebaseUid?: string;
}

export interface ImportProductRowResultDto {
  rowIndex: number;
  status: "created" | "updated" | "failed" | "skipped";
  title: string | null;
  errors: string[];
  productId?: number;
}

export interface ImportProductsResultDto {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  results: ImportProductRowResultDto[];
}

function adminHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("adminAccessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...adminHeaders(),
      ...(options.headers as Record<string, string>),
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  const text = await response.text();
  if (!text || text.trim() === "") {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

export const rubberPortalApi = {
  productCodings: async (codingType?: string): Promise<RubberProductCodingDto[]> => {
    const query = codingType ? `?codingType=${codingType}` : "";
    return request(`/rubber-lining/portal/product-codings${query}`);
  },

  productCodingById: async (id: number): Promise<RubberProductCodingDto> => {
    return request(`/rubber-lining/portal/product-codings/${id}`);
  },

  createProductCoding: async (
    data: Omit<RubberProductCodingDto, "id" | "firebaseUid">,
  ): Promise<RubberProductCodingDto> => {
    return request("/rubber-lining/portal/product-codings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateProductCoding: async (
    id: number,
    data: Partial<RubberProductCodingDto>,
  ): Promise<RubberProductCodingDto> => {
    return request(`/rubber-lining/portal/product-codings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteProductCoding: async (id: number): Promise<void> => {
    return request(`/rubber-lining/portal/product-codings/${id}`, {
      method: "DELETE",
    });
  },

  pricingTiers: async (): Promise<RubberPricingTierDto[]> => {
    return request("/rubber-lining/portal/pricing-tiers");
  },

  pricingTierById: async (id: number): Promise<RubberPricingTierDto> => {
    return request(`/rubber-lining/portal/pricing-tiers/${id}`);
  },

  createPricingTier: async (
    data: Omit<RubberPricingTierDto, "id">,
  ): Promise<RubberPricingTierDto> => {
    return request("/rubber-lining/portal/pricing-tiers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updatePricingTier: async (
    id: number,
    data: Partial<RubberPricingTierDto>,
  ): Promise<RubberPricingTierDto> => {
    return request(`/rubber-lining/portal/pricing-tiers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deletePricingTier: async (id: number): Promise<void> => {
    return request(`/rubber-lining/portal/pricing-tiers/${id}`, {
      method: "DELETE",
    });
  },

  companies: async (): Promise<RubberCompanyDto[]> => {
    return request("/rubber-lining/portal/companies");
  },

  companyById: async (id: number): Promise<RubberCompanyDto> => {
    return request(`/rubber-lining/portal/companies/${id}`);
  },

  createCompany: async (data: {
    name: string;
    companyType?: CompanyType;
    code?: string;
    pricingTierId?: number;
    availableProducts?: string[];
    isCompoundOwner?: boolean;
    vatNumber?: string;
    registrationNumber?: string;
    address?: Record<string, string>;
    notes?: string;
  }): Promise<RubberCompanyDto> => {
    return request("/rubber-lining/portal/companies", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateCompany: async (
    id: number,
    data: Partial<{
      name: string;
      companyType?: CompanyType;
      code?: string;
      pricingTierId?: number;
      availableProducts?: string[];
      isCompoundOwner?: boolean;
      vatNumber?: string;
      registrationNumber?: string;
      address?: Record<string, string>;
      notes?: string;
    }>,
  ): Promise<RubberCompanyDto> => {
    return request(`/rubber-lining/portal/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteCompany: async (id: number): Promise<void> => {
    return request(`/rubber-lining/portal/companies/${id}`, {
      method: "DELETE",
    });
  },

  products: async (): Promise<RubberProductDto[]> => {
    return request("/rubber-lining/portal/products");
  },

  productById: async (id: number): Promise<RubberProductDto> => {
    return request(`/rubber-lining/portal/products/${id}`);
  },

  createProduct: async (data: CreateRubberProductDto): Promise<RubberProductDto> => {
    return request("/rubber-lining/portal/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateProduct: async (
    id: number,
    data: Partial<CreateRubberProductDto>,
  ): Promise<RubberProductDto> => {
    return request(`/rubber-lining/portal/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteProduct: async (id: number): Promise<void> => {
    return request(`/rubber-lining/portal/products/${id}`, {
      method: "DELETE",
    });
  },

  orders: async (status?: number): Promise<RubberOrderDto[]> => {
    const query = status !== undefined ? `?status=${status}` : "";
    return request(`/rubber-lining/portal/orders${query}`);
  },

  orderById: async (id: number): Promise<RubberOrderDto> => {
    return request(`/rubber-lining/portal/orders/${id}`);
  },

  createOrder: async (data: {
    orderNumber?: string;
    companyOrderNumber?: string;
    companyId?: number;
    items?: {
      productId?: number;
      thickness?: number;
      width?: number;
      length?: number;
      quantity?: number;
      callOffs?: CallOff[];
    }[];
  }): Promise<RubberOrderDto> => {
    return request("/rubber-lining/portal/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateOrder: async (
    id: number,
    data: {
      companyOrderNumber?: string;
      status?: number;
      companyId?: number;
      items?: {
        productId?: number;
        thickness?: number;
        width?: number;
        length?: number;
        quantity?: number;
        callOffs?: CallOff[];
      }[];
    },
  ): Promise<RubberOrderDto> => {
    return request(`/rubber-lining/portal/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteOrder: async (id: number): Promise<void> => {
    return request(`/rubber-lining/portal/orders/${id}`, {
      method: "DELETE",
    });
  },

  orderStatuses: async (): Promise<{ value: number; label: string }[]> => {
    return request("/rubber-lining/portal/order-statuses");
  },

  codingTypes: async (): Promise<{ value: string; label: string }[]> => {
    return request("/rubber-lining/portal/coding-types");
  },

  calculatePrice: async (data: {
    productId: number;
    companyId: number;
    thickness: number;
    width: number;
    length: number;
    quantity: number;
  }): Promise<RubberPriceCalculationDto> => {
    return request("/rubber-lining/portal/calculate-price", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  importProducts: async (data: {
    rows: ImportProductRowDto[];
    updateExisting?: boolean;
  }): Promise<ImportProductsResultDto> => {
    return request("/rubber-lining/portal/products/import", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
