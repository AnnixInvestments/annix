import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const SAGE_BASE_URL = "https://accounting.sageone.co.za/api/2.0.0";

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

@Injectable()
export class SageApiService {
  private readonly logger = new Logger(SageApiService.name);

  constructor(private readonly configService: ConfigService) {}

  private apiKey(): string | null {
    return this.configService.get<string>("SAGE_CLIENT_ID") ?? null;
  }

  private authHeader(username: string, password: string): string {
    return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  }

  private async request<T>(
    path: string,
    username: string,
    password: string,
  ): Promise<T> {
    const key = this.apiKey();
    if (!key) {
      throw new Error("SAGE_CLIENT_ID not configured");
    }

    const separator = path.includes("?") ? "&" : "?";
    const url = `${SAGE_BASE_URL}/${path}${separator}apikey=${encodeURIComponent(key)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: this.authHeader(username, password),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Sage API ${response.status}: ${body}`);
      throw new Error(`Sage API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async companies(username: string, password: string): Promise<SageCompany[]> {
    return this.request<SageCompany[]>("Company/Get", username, password);
  }

  async suppliers(
    username: string,
    password: string,
    sageCompanyId: number,
  ): Promise<SageSupplier[]> {
    return this.request<SageSupplier[]>(
      `Supplier/Get?companyid=${sageCompanyId}`,
      username,
      password,
    );
  }

  async customers(
    username: string,
    password: string,
    sageCompanyId: number,
  ): Promise<SageCustomer[]> {
    return this.request<SageCustomer[]>(
      `Customer/Get?companyid=${sageCompanyId}`,
      username,
      password,
    );
  }

  async taxTypes(
    username: string,
    password: string,
    sageCompanyId: number,
  ): Promise<SageTaxType[]> {
    return this.request<SageTaxType[]>(
      `TaxType/Get?companyid=${sageCompanyId}`,
      username,
      password,
    );
  }

  async testConnection(
    username: string,
    password: string,
  ): Promise<{ success: boolean; companies: SageCompany[] }> {
    const result = await this.companies(username, password);
    return { success: true, companies: result };
  }
}
