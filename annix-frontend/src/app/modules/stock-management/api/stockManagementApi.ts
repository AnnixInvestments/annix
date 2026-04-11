import type {
  CreateIssuanceSessionDto,
  IssuanceSessionDto,
  IssuanceSessionFiltersDto,
  IssuanceSessionListResultDto,
} from "../types/issuance";
import type {
  StockManagementFeatureKey,
  StockManagementLicenseSnapshot,
  StockManagementTier,
} from "../types/license";
import type {
  IssuableProductDto,
  IssuableProductListResultDto,
  IssuableProductType,
  ProductCategoryDto,
} from "../types/products";

export interface StockManagementApiClientOptions {
  baseUrl: string;
  headers?: () => Record<string, string>;
}

export class StockManagementApiClient {
  constructor(private readonly options: StockManagementApiClientOptions) {}

  async licenseSelf(): Promise<StockManagementLicenseSnapshot> {
    return this.request("GET", "/license/self");
  }

  async licenseByCompany(companyId: number): Promise<StockManagementLicenseSnapshot> {
    return this.request("GET", `/license/${companyId}`);
  }

  async setTier(
    companyId: number,
    tier: StockManagementTier,
    notes?: string,
  ): Promise<StockManagementLicenseSnapshot> {
    return this.request("PATCH", `/license/${companyId}/tier`, { tier, notes });
  }

  async setFeatureOverride(
    companyId: number,
    feature: StockManagementFeatureKey,
    enabled: boolean | null,
  ): Promise<StockManagementLicenseSnapshot> {
    return this.request("PATCH", `/license/${companyId}/feature-override`, { feature, enabled });
  }

  async setValidity(
    companyId: number,
    validFrom: string | null,
    validUntil: string | null,
  ): Promise<StockManagementLicenseSnapshot> {
    return this.request("PATCH", `/license/${companyId}/validity`, { validFrom, validUntil });
  }

  async setActive(companyId: number, active: boolean): Promise<StockManagementLicenseSnapshot> {
    return this.request("PATCH", `/license/${companyId}/active`, { active });
  }

  async listProducts(
    filters: {
      productType?: IssuableProductType;
      categoryId?: number;
      active?: boolean;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<IssuableProductListResultDto> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    const query = params.toString();
    return this.request("GET", `/products${query ? `?${query}` : ""}`);
  }

  async productById(id: number): Promise<IssuableProductDto> {
    return this.request("GET", `/products/${id}`);
  }

  async listProductCategories(productType?: IssuableProductType): Promise<ProductCategoryDto[]> {
    const path = productType
      ? `/product-categories?productType=${productType}`
      : "/product-categories";
    return this.request("GET", path);
  }

  async listIssuanceSessions(
    filters: IssuanceSessionFiltersDto = {},
  ): Promise<IssuanceSessionListResultDto> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    const query = params.toString();
    return this.request("GET", `/issuance/sessions${query ? `?${query}` : ""}`);
  }

  async issuanceSessionById(id: number): Promise<IssuanceSessionDto> {
    return this.request("GET", `/issuance/sessions/${id}`);
  }

  async createIssuanceSession(dto: CreateIssuanceSessionDto): Promise<IssuanceSessionDto> {
    return this.request("POST", "/issuance/sessions", dto);
  }

  async undoIssuanceSession(id: number): Promise<IssuanceSessionDto> {
    return this.request("POST", `/issuance/sessions/${id}/undo`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.options.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(this.options.headers ? this.options.headers() : {}),
    };
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Stock management API ${method} ${path} failed: ${response.status} ${text}`);
    }
    return response.json() as Promise<T>;
  }
}
