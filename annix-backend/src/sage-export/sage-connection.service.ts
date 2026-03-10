import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { decrypt, encrypt } from "../secure-documents/crypto.util";
import { StockControlCompany } from "../stock-control/entities/stock-control-company.entity";
import {
  SageApiService,
  SageCompany,
  SageCustomer,
  SageSupplier,
  SageTaxType,
} from "./sage-api.service";

export interface SageConfigDto {
  sageUsername: string | null;
  sagePassword: string | null;
  sageCompanyId: number | null;
  sageCompanyName: string | null;
}

export interface SageConnectionStatus {
  connected: boolean;
  sageUsername: string | null;
  sagePasswordSet: boolean;
  sageCompanyId: number | null;
  sageCompanyName: string | null;
  sageConnectedAt: Date | null;
}

@Injectable()
export class SageConnectionService {
  private readonly logger = new Logger(SageConnectionService.name);

  constructor(
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    private readonly configService: ConfigService,
    private readonly sageApiService: SageApiService,
  ) {}

  async connectionStatus(companyId: number): Promise<SageConnectionStatus> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    return {
      connected:
        company?.sageUsername !== null &&
        company?.sagePassEncrypted !== null &&
        company?.sageCompanyId !== null,
      sageUsername: company?.sageUsername ?? null,
      sagePasswordSet:
        company?.sagePassEncrypted !== null && company?.sagePassEncrypted !== undefined,
      sageCompanyId: company?.sageCompanyId ?? null,
      sageCompanyName: company?.sageCompanyName ?? null,
      sageConnectedAt: company?.sageConnectedAt ?? null,
    };
  }

  async saveCredentials(companyId: number, dto: SageConfigDto): Promise<{ message: string }> {
    const encryptionKey = this.configService.get<string>("DOCUMENT_ENCRYPTION_KEY");

    const update: Partial<StockControlCompany> = {
      sageUsername: dto.sageUsername,
      sageCompanyId: dto.sageCompanyId,
      sageCompanyName: dto.sageCompanyName,
    };

    if (dto.sagePassword !== null && dto.sagePassword !== undefined && encryptionKey) {
      update.sagePassEncrypted = encrypt(dto.sagePassword, encryptionKey);
    } else if (dto.sageUsername === null) {
      update.sagePassEncrypted = null;
      update.sageConnectedAt = null;
    }

    if (dto.sageCompanyId !== null) {
      update.sageConnectedAt = new Date();
    }

    await this.companyRepo.update(companyId, update);
    return { message: "Sage configuration updated" };
  }

  async disconnect(companyId: number): Promise<{ message: string }> {
    await this.companyRepo.update(companyId, {
      sageUsername: null,
      sagePassEncrypted: null,
      sageCompanyId: null,
      sageCompanyName: null,
      sageConnectedAt: null,
    });
    return { message: "Sage connection removed" };
  }

  async testConnection(
    companyId: number,
    username?: string,
    password?: string,
  ): Promise<{ success: boolean; companies: SageCompany[] }> {
    const resolvedCredentials = await this.resolveCredentials(companyId, username, password);
    return this.sageApiService.testConnection(
      resolvedCredentials.username,
      resolvedCredentials.password,
    );
  }

  async sageCompanies(
    companyId: number,
    username?: string,
    password?: string,
  ): Promise<SageCompany[]> {
    const creds = await this.resolveCredentials(companyId, username, password);
    return this.sageApiService.companies(creds.username, creds.password);
  }

  async sageSuppliers(companyId: number): Promise<SageSupplier[]> {
    const creds = await this.storedCredentials(companyId);
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company?.sageCompanyId) {
      throw new Error("No Sage company selected");
    }
    return this.sageApiService.suppliers(creds.username, creds.password, company.sageCompanyId);
  }

  async sageCustomers(companyId: number): Promise<SageCustomer[]> {
    const creds = await this.storedCredentials(companyId);
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company?.sageCompanyId) {
      throw new Error("No Sage company selected");
    }
    return this.sageApiService.customers(creds.username, creds.password, company.sageCompanyId);
  }

  async sageTaxTypes(companyId: number): Promise<SageTaxType[]> {
    const creds = await this.storedCredentials(companyId);
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company?.sageCompanyId) {
      throw new Error("No Sage company selected");
    }
    return this.sageApiService.taxTypes(creds.username, creds.password, company.sageCompanyId);
  }

  private async resolveCredentials(
    companyId: number,
    username?: string,
    password?: string,
  ): Promise<{ username: string; password: string }> {
    if (username && password) {
      return { username, password };
    }
    return this.storedCredentials(companyId);
  }

  private async storedCredentials(
    companyId: number,
  ): Promise<{ username: string; password: string }> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    if (!company?.sageUsername || !company?.sagePassEncrypted) {
      throw new Error("Sage credentials not configured for this company");
    }

    const encryptionKey = this.configService.get<string>("DOCUMENT_ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new Error("DOCUMENT_ENCRYPTION_KEY not configured");
    }

    const password = decrypt(company.sagePassEncrypted, encryptionKey);
    return { username: company.sageUsername, password };
  }
}
