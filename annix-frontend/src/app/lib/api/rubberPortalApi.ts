import { API_BASE_URL } from '@/lib/api-config';

export interface RubberProductCodingDto {
  id: number;
  codingType: 'COLOUR' | 'COMPOUND' | 'CURING_METHOD' | 'GRADE' | 'HARDNESS' | 'TYPE';
  code: string;
  name: string;
}

export interface RubberPricingTierDto {
  id: number;
  name: string;
  pricingFactor: number;
}

export interface RubberCompanyDto {
  id: number;
  name: string;
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
  title: string | null;
  description: string | null;
  specificGravity: number | null;
  compoundOwnerName: string | null;
  compoundName: string | null;
  typeName: string | null;
  costPerKg: number | null;
  colourName: string | null;
  hardnessName: string | null;
  curingMethodName: string | null;
  gradeName: string | null;
  markup: number | null;
  pricePerKg: number | null;
}

export interface CallOff {
  quantity: number;
  quantityRemaining: number;
  events: { timestamp: number; status: number }[];
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

function adminHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('adminAccessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
  if (!text || text.trim() === '') {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

export const rubberPortalApi = {
  productCodings: async (codingType?: string): Promise<RubberProductCodingDto[]> => {
    const query = codingType ? `?codingType=${codingType}` : '';
    return request(`/rubber-lining/portal/product-codings${query}`);
  },

  productCodingById: async (id: number): Promise<RubberProductCodingDto> => {
    return request(`/rubber-lining/portal/product-codings/${id}`);
  },

  createProductCoding: async (data: Omit<RubberProductCodingDto, 'id'>): Promise<RubberProductCodingDto> => {
    return request('/rubber-lining/portal/product-codings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProductCoding: async (id: number, data: Partial<RubberProductCodingDto>): Promise<RubberProductCodingDto> => {
    return request(`/rubber-lining/portal/product-codings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteProductCoding: async (id: number): Promise<void> => {
    return request(`/rubber-lining/portal/product-codings/${id}`, {
      method: 'DELETE',
    });
  },

  pricingTiers: async (): Promise<RubberPricingTierDto[]> => {
    return request('/rubber-lining/portal/pricing-tiers');
  },

  pricingTierById: async (id: number): Promise<RubberPricingTierDto> => {
    return request(`/rubber-lining/portal/pricing-tiers/${id}`);
  },

  createPricingTier: async (data: Omit<RubberPricingTierDto, 'id'>): Promise<RubberPricingTierDto> => {
    return request('/rubber-lining/portal/pricing-tiers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updatePricingTier: async (id: number, data: Partial<RubberPricingTierDto>): Promise<RubberPricingTierDto> => {
    return request(`/rubber-lining/portal/pricing-tiers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deletePricingTier: async (id: number): Promise<void> => {
    return request(`/rubber-lining/portal/pricing-tiers/${id}`, {
      method: 'DELETE',
    });
  },

  companies: async (): Promise<RubberCompanyDto[]> => {
    return request('/rubber-lining/portal/companies');
  },

  companyById: async (id: number): Promise<RubberCompanyDto> => {
    return request(`/rubber-lining/portal/companies/${id}`);
  },

  createCompany: async (data: {
    name: string;
    code?: string;
    pricingTierId?: number;
    availableProducts?: string[];
    isCompoundOwner?: boolean;
    vatNumber?: string;
    registrationNumber?: string;
    address?: Record<string, string>;
    notes?: string;
  }): Promise<RubberCompanyDto> => {
    return request('/rubber-lining/portal/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCompany: async (id: number, data: Partial<{
    name: string;
    code?: string;
    pricingTierId?: number;
    availableProducts?: string[];
    isCompoundOwner?: boolean;
    vatNumber?: string;
    registrationNumber?: string;
    address?: Record<string, string>;
    notes?: string;
  }>): Promise<RubberCompanyDto> => {
    return request(`/rubber-lining/portal/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteCompany: async (id: number): Promise<void> => {
    return request(`/rubber-lining/portal/companies/${id}`, {
      method: 'DELETE',
    });
  },

  products: async (): Promise<RubberProductDto[]> => {
    return request('/rubber-lining/portal/products');
  },

  productById: async (id: number): Promise<RubberProductDto> => {
    return request(`/rubber-lining/portal/products/${id}`);
  },

  createProduct: async (data: Record<string, unknown>): Promise<RubberProductDto> => {
    return request('/rubber-lining/portal/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProduct: async (id: number, data: Record<string, unknown>): Promise<RubberProductDto> => {
    return request(`/rubber-lining/portal/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteProduct: async (id: number): Promise<void> => {
    return request(`/rubber-lining/portal/products/${id}`, {
      method: 'DELETE',
    });
  },

  orders: async (status?: number): Promise<RubberOrderDto[]> => {
    const query = status !== undefined ? `?status=${status}` : '';
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
    return request('/rubber-lining/portal/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateOrder: async (id: number, data: {
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
  }): Promise<RubberOrderDto> => {
    return request(`/rubber-lining/portal/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteOrder: async (id: number): Promise<void> => {
    return request(`/rubber-lining/portal/orders/${id}`, {
      method: 'DELETE',
    });
  },

  orderStatuses: async (): Promise<{ value: number; label: string }[]> => {
    return request('/rubber-lining/portal/order-statuses');
  },

  codingTypes: async (): Promise<{ value: string; label: string }[]> => {
    return request('/rubber-lining/portal/coding-types');
  },

  calculatePrice: async (data: {
    productId: number;
    companyId: number;
    thickness: number;
    width: number;
    length: number;
    quantity: number;
  }): Promise<RubberPriceCalculationDto> => {
    return request('/rubber-lining/portal/calculate-price', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
