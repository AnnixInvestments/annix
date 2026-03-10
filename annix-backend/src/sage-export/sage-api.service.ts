import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const SAGE_BASE_URL = "https://accounting.sageone.co.za/api/2.0.0";
const SAGE_TOKEN_URL = "https://oauth.accounting.sage.com/token";
const SAGE_AUTH_URL = "https://www.sageone.com/oauth2/auth/central";

export interface SageCompany {
  ID: number;
  Name: string;
  CurrencySymbol: string;
  TaxNumber: string;
}

export interface SageSupplier {
  ID: number;
  Name: string;
  Category: { ID: number; Description: string } | null;
  TaxReference: string;
  ContactName: string;
  Telephone: string;
  Email: string;
  Active: boolean;
}

export interface SageCustomer {
  ID: number;
  Name: string;
  Category: { ID: number; Description: string } | null;
  TaxReference: string;
  ContactName: string;
  Telephone: string;
  Email: string;
  Active: boolean;
}

export interface SageTaxType {
  ID: number;
  Name: string;
  Percentage: number;
  IsDefault: boolean;
}

export interface SageInvoiceLine {
  SelectionId: number;
  TaxTypeId: number;
  Description: string;
  Quantity: number;
  UnitPriceExclusive: number;
}

export interface SagePurchaseInvoicePayload {
  SupplierId: number;
  Date: string;
  DueDate: string;
  Reference: string;
  Lines: SageInvoiceLine[];
}

export interface SageSalesInvoicePayload {
  CustomerId: number;
  Date: string;
  DueDate: string;
  Reference: string;
  Lines: SageInvoiceLine[];
}

export interface SageSavedInvoiceResponse {
  ID: number;
  Date: string;
  Reference: string;
  Total: number;
}

export interface SageTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable()
export class SageApiService {
  private readonly logger = new Logger(SageApiService.name);

  constructor(private readonly configService: ConfigService) {}

  private clientId(): string {
    const id = this.configService.get<string>("SAGE_CLIENT_ID") ?? null;
    if (!id) {
      throw new BadRequestException("SAGE_CLIENT_ID not configured");
    }
    return id;
  }

  private clientSecret(): string {
    const secret = this.configService.get<string>("SAGE_CLIENT_SECRET") ?? null;
    if (!secret) {
      throw new BadRequestException("SAGE_CLIENT_SECRET not configured");
    }
    return secret;
  }

  authorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "full_access",
      state,
    });
    return `${SAGE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<SageTokenResponse> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      redirect_uri: redirectUri,
    });

    const response = await fetch(SAGE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Sage token exchange failed (${response.status}): ${text}`);
      throw new BadRequestException(`Sage token exchange failed: ${text}`);
    }

    return response.json() as Promise<SageTokenResponse>;
  }

  async refreshToken(refreshToken: string): Promise<SageTokenResponse> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
    });

    const response = await fetch(SAGE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Sage token refresh failed (${response.status}): ${text}`);
      throw new BadRequestException(`Sage token refresh failed: ${text}`);
    }

    return response.json() as Promise<SageTokenResponse>;
  }

  private async request<T>(
    path: string,
    accessToken: string,
    options?: { method?: string; body?: unknown },
  ): Promise<T> {
    const method = options?.method ?? "GET";
    const url = `${SAGE_BASE_URL}/${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    };

    const fetchOptions: RequestInit = { method, headers };

    if (options?.body) {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Sage API ${method} ${response.status}: ${body}`);
      throw new BadRequestException(`Sage API error (${response.status}): ${body}`);
    }

    return response.json() as Promise<T>;
  }

  async companies(accessToken: string): Promise<SageCompany[]> {
    return this.request<SageCompany[]>("Company/Get", accessToken);
  }

  async suppliers(accessToken: string, sageCompanyId: number): Promise<SageSupplier[]> {
    return this.request<SageSupplier[]>(`Supplier/Get?companyid=${sageCompanyId}`, accessToken);
  }

  async customers(accessToken: string, sageCompanyId: number): Promise<SageCustomer[]> {
    return this.request<SageCustomer[]>(`Customer/Get?companyid=${sageCompanyId}`, accessToken);
  }

  async taxTypes(accessToken: string, sageCompanyId: number): Promise<SageTaxType[]> {
    return this.request<SageTaxType[]>(`TaxType/Get?companyid=${sageCompanyId}`, accessToken);
  }

  async savePurchaseInvoice(
    accessToken: string,
    sageCompanyId: number,
    payload: SagePurchaseInvoicePayload,
  ): Promise<SageSavedInvoiceResponse> {
    return this.request<SageSavedInvoiceResponse>(
      `SupplierInvoice/Save?companyid=${sageCompanyId}`,
      accessToken,
      { method: "POST", body: payload },
    );
  }

  async saveSalesInvoice(
    accessToken: string,
    sageCompanyId: number,
    payload: SageSalesInvoicePayload,
  ): Promise<SageSavedInvoiceResponse> {
    return this.request<SageSavedInvoiceResponse>(
      `TaxInvoice/Save?companyid=${sageCompanyId}`,
      accessToken,
      { method: "POST", body: payload },
    );
  }
}
