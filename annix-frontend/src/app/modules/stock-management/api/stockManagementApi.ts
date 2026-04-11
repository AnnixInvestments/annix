import type {
  StockManagementFeatureKey,
  StockManagementLicenseSnapshot,
  StockManagementTier,
} from "../types/license";

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
