import { API_BASE_URL } from "@/lib/api-config";
import type {
  CallOff,
  CreateRubberProductDto,
  ImportProductRowDto,
  ImportProductsResultDto,
  RubberCompanyDto,
  RubberOrderDto,
  RubberPriceCalculationDto,
  RubberPricingTierDto,
  RubberProductCodingDto,
  RubberProductDto,
} from "./rubberPortalApi";

export interface AuRubberLoginDto {
  email: string;
  password: string;
}

export interface AuRubberUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuRubberLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuRubberUser;
}

export interface AuRubberUserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  createdAt: string;
  lastActiveAt?: string;
}

const TOKEN_KEYS = {
  accessToken: "auRubberAccessToken",
  refreshToken: "auRubberRefreshToken",
} as const;

class AuRubberApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;

    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken = localStorage.getItem(TOKEN_KEYS.refreshToken);
    }
  }

  private headers(): Record<string, string> {
    if (!this.accessToken && typeof window !== "undefined") {
      this.accessToken = localStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken = localStorage.getItem(TOKEN_KEYS.refreshToken);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  private setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEYS.accessToken, accessToken);
      localStorage.setItem(TOKEN_KEYS.refreshToken, refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEYS.accessToken);
      localStorage.removeItem(TOKEN_KEYS.refreshToken);
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.headers(),
        ...(options.headers as Record<string, string>),
      },
    };

    const response = await fetch(url, config);

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        config.headers = {
          ...this.headers(),
          ...(options.headers as Record<string, string>),
        };
        const retryResponse = await fetch(url, config);
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          throw new Error(`API Error (${retryResponse.status}): ${errorText}`);
        }
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error (${response.status}): ${errorText}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Use raw error text if not JSON
      }

      throw new Error(errorMessage);
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/admin/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      this.accessToken = data.accessToken;
      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEYS.accessToken, data.accessToken);
      }
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  async login(dto: AuRubberLoginDto): Promise<AuRubberLoginResponse> {
    const response = await this.request<AuRubberLoginResponse>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify(dto),
    });

    this.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request("/admin/auth/logout", { method: "POST" });
    } finally {
      this.clearTokens();
    }
  }

  async currentUser(): Promise<AuRubberUserProfile> {
    return this.request<AuRubberUserProfile>("/admin/auth/me");
  }

  async productCodings(codingType?: string): Promise<RubberProductCodingDto[]> {
    const query = codingType ? `?codingType=${codingType}` : "";
    return this.request(`/rubber-lining/portal/product-codings${query}`);
  }

  async productCodingById(id: number): Promise<RubberProductCodingDto> {
    return this.request(`/rubber-lining/portal/product-codings/${id}`);
  }

  async createProductCoding(
    data: Omit<RubberProductCodingDto, "id" | "firebaseUid">,
  ): Promise<RubberProductCodingDto> {
    return this.request("/rubber-lining/portal/product-codings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProductCoding(
    id: number,
    data: Partial<RubberProductCodingDto>,
  ): Promise<RubberProductCodingDto> {
    return this.request(`/rubber-lining/portal/product-codings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProductCoding(id: number): Promise<void> {
    return this.request(`/rubber-lining/portal/product-codings/${id}`, {
      method: "DELETE",
    });
  }

  async pricingTiers(): Promise<RubberPricingTierDto[]> {
    return this.request("/rubber-lining/portal/pricing-tiers");
  }

  async pricingTierById(id: number): Promise<RubberPricingTierDto> {
    return this.request(`/rubber-lining/portal/pricing-tiers/${id}`);
  }

  async createPricingTier(data: Omit<RubberPricingTierDto, "id">): Promise<RubberPricingTierDto> {
    return this.request("/rubber-lining/portal/pricing-tiers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePricingTier(
    id: number,
    data: Partial<RubberPricingTierDto>,
  ): Promise<RubberPricingTierDto> {
    return this.request(`/rubber-lining/portal/pricing-tiers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePricingTier(id: number): Promise<void> {
    return this.request(`/rubber-lining/portal/pricing-tiers/${id}`, {
      method: "DELETE",
    });
  }

  async companies(): Promise<RubberCompanyDto[]> {
    return this.request("/rubber-lining/portal/companies");
  }

  async companyById(id: number): Promise<RubberCompanyDto> {
    return this.request(`/rubber-lining/portal/companies/${id}`);
  }

  async createCompany(data: {
    name: string;
    code?: string;
    pricingTierId?: number;
    availableProducts?: string[];
    isCompoundOwner?: boolean;
    vatNumber?: string;
    registrationNumber?: string;
    address?: Record<string, string>;
    notes?: string;
  }): Promise<RubberCompanyDto> {
    return this.request("/rubber-lining/portal/companies", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCompany(
    id: number,
    data: Partial<{
      name: string;
      code?: string;
      pricingTierId?: number;
      availableProducts?: string[];
      isCompoundOwner?: boolean;
      vatNumber?: string;
      registrationNumber?: string;
      address?: Record<string, string>;
      notes?: string;
    }>,
  ): Promise<RubberCompanyDto> {
    return this.request(`/rubber-lining/portal/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCompany(id: number): Promise<void> {
    return this.request(`/rubber-lining/portal/companies/${id}`, {
      method: "DELETE",
    });
  }

  async products(): Promise<RubberProductDto[]> {
    return this.request("/rubber-lining/portal/products");
  }

  async productById(id: number): Promise<RubberProductDto> {
    return this.request(`/rubber-lining/portal/products/${id}`);
  }

  async createProduct(data: CreateRubberProductDto): Promise<RubberProductDto> {
    return this.request("/rubber-lining/portal/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProduct(
    id: number,
    data: Partial<CreateRubberProductDto>,
  ): Promise<RubberProductDto> {
    return this.request(`/rubber-lining/portal/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: number): Promise<void> {
    return this.request(`/rubber-lining/portal/products/${id}`, {
      method: "DELETE",
    });
  }

  async orders(status?: number): Promise<RubberOrderDto[]> {
    const query = status !== undefined ? `?status=${status}` : "";
    return this.request(`/rubber-lining/portal/orders${query}`);
  }

  async orderById(id: number): Promise<RubberOrderDto> {
    return this.request(`/rubber-lining/portal/orders/${id}`);
  }

  async createOrder(data: {
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
  }): Promise<RubberOrderDto> {
    return this.request("/rubber-lining/portal/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateOrder(
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
  ): Promise<RubberOrderDto> {
    return this.request(`/rubber-lining/portal/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteOrder(id: number): Promise<void> {
    return this.request(`/rubber-lining/portal/orders/${id}`, {
      method: "DELETE",
    });
  }

  async orderStatuses(): Promise<{ value: number; label: string }[]> {
    return this.request("/rubber-lining/portal/order-statuses");
  }

  async codingTypes(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/coding-types");
  }

  async calculatePrice(data: {
    productId: number;
    companyId: number;
    thickness: number;
    width: number;
    length: number;
    quantity: number;
  }): Promise<RubberPriceCalculationDto> {
    return this.request("/rubber-lining/portal/calculate-price", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async importProducts(data: {
    rows: ImportProductRowDto[];
    updateExisting?: boolean;
  }): Promise<ImportProductsResultDto> {
    return this.request("/rubber-lining/portal/products/import", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const auRubberApiClient = new AuRubberApiClient();
