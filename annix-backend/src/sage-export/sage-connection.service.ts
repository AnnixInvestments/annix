import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { decrypt, encrypt } from "../secure-documents/crypto.util";
import { SageConnection } from "./entities/sage-connection.entity";
import {
  SageApiService,
  type SageCompany,
  type SageCustomer,
  type SageSupplier,
  type SageTaxType,
} from "./sage-api.service";

export interface SageConfigDto {
  sageUsername: string | null;
  sagePassword: string | null;
  sageCompanyId: number | null;
  sageCompanyName: string | null;
}

export interface SageConnectionStatus {
  connected: boolean;
  enabled: boolean;
  sageUsername: string | null;
  sagePasswordSet: boolean;
  sageCompanyId: number | null;
  sageCompanyName: string | null;
  connectedAt: Date | null;
}

@Injectable()
export class SageConnectionService {
  private readonly logger = new Logger(SageConnectionService.name);

  constructor(
    @InjectRepository(SageConnection)
    private readonly connectionRepo: Repository<SageConnection>,
    private readonly configService: ConfigService,
    private readonly sageApiService: SageApiService,
  ) {}

  async connectionStatus(appKey: string): Promise<SageConnectionStatus> {
    const conn = await this.connectionRepo.findOne({ where: { appKey } });

    if (!conn) {
      return {
        connected: false,
        enabled: false,
        sageUsername: null,
        sagePasswordSet: false,
        sageCompanyId: null,
        sageCompanyName: null,
        connectedAt: null,
      };
    }

    return {
      connected:
        conn.sageUsername !== null &&
        conn.sagePassEncrypted !== null &&
        conn.sageCompanyId !== null,
      enabled: conn.enabled,
      sageUsername: conn.sageUsername,
      sagePasswordSet: conn.sagePassEncrypted !== null,
      sageCompanyId: conn.sageCompanyId,
      sageCompanyName: conn.sageCompanyName,
      connectedAt: conn.connectedAt,
    };
  }

  async addonEnabled(appKey: string): Promise<boolean> {
    const conn = await this.connectionRepo.findOne({ where: { appKey } });
    return conn?.enabled ?? false;
  }

  async saveCredentials(appKey: string, dto: SageConfigDto): Promise<{ message: string }> {
    const encryptionKey = this.configService.get<string>("DOCUMENT_ENCRYPTION_KEY");

    let conn = await this.connectionRepo.findOne({ where: { appKey } });
    if (!conn) {
      conn = this.connectionRepo.create({ appKey, enabled: false });
    }

    conn.sageUsername = dto.sageUsername;
    conn.sageCompanyId = dto.sageCompanyId;
    conn.sageCompanyName = dto.sageCompanyName;

    if (dto.sagePassword !== null && dto.sagePassword !== undefined && encryptionKey) {
      conn.sagePassEncrypted = encrypt(dto.sagePassword, encryptionKey);
    } else if (dto.sageUsername === null) {
      conn.sagePassEncrypted = null;
      conn.connectedAt = null;
    }

    if (dto.sageCompanyId !== null) {
      conn.connectedAt = new Date();
    }

    await this.connectionRepo.save(conn);
    return { message: "Sage configuration updated" };
  }

  async disconnect(appKey: string): Promise<{ message: string }> {
    await this.connectionRepo.update(
      { appKey },
      {
        sageUsername: null,
        sagePassEncrypted: null,
        sageCompanyId: null,
        sageCompanyName: null,
        connectedAt: null,
      },
    );
    return { message: "Sage connection removed" };
  }

  async testConnection(
    appKey: string,
    username?: string,
    password?: string,
  ): Promise<{ success: boolean; companies: SageCompany[] }> {
    const creds = await this.resolveCredentials(appKey, username, password);
    return this.sageApiService.testConnection(creds.username, creds.password);
  }

  async sageCompanies(
    appKey: string,
    username?: string,
    password?: string,
  ): Promise<SageCompany[]> {
    const creds = await this.resolveCredentials(appKey, username, password);
    return this.sageApiService.companies(creds.username, creds.password);
  }

  async sageSuppliers(appKey: string): Promise<SageSupplier[]> {
    const creds = await this.storedCredentials(appKey);
    const conn = await this.connectionRepo.findOne({ where: { appKey } });
    if (!conn?.sageCompanyId) {
      throw new Error("No Sage company selected");
    }
    return this.sageApiService.suppliers(creds.username, creds.password, conn.sageCompanyId);
  }

  async sageCustomers(appKey: string): Promise<SageCustomer[]> {
    const creds = await this.storedCredentials(appKey);
    const conn = await this.connectionRepo.findOne({ where: { appKey } });
    if (!conn?.sageCompanyId) {
      throw new Error("No Sage company selected");
    }
    return this.sageApiService.customers(creds.username, creds.password, conn.sageCompanyId);
  }

  async sageTaxTypes(appKey: string): Promise<SageTaxType[]> {
    const creds = await this.storedCredentials(appKey);
    const conn = await this.connectionRepo.findOne({ where: { appKey } });
    if (!conn?.sageCompanyId) {
      throw new Error("No Sage company selected");
    }
    return this.sageApiService.taxTypes(creds.username, creds.password, conn.sageCompanyId);
  }

  private async resolveCredentials(
    appKey: string,
    username?: string,
    password?: string,
  ): Promise<{ username: string; password: string }> {
    if (username && password) {
      return { username, password };
    }
    return this.storedCredentials(appKey);
  }

  private async storedCredentials(appKey: string): Promise<{ username: string; password: string }> {
    const conn = await this.connectionRepo.findOne({ where: { appKey } });

    if (!conn?.sageUsername || !conn?.sagePassEncrypted) {
      throw new Error("Sage credentials not configured");
    }

    const encryptionKey = this.configService.get<string>("DOCUMENT_ENCRYPTION_KEY");
    if (!encryptionKey) {
      throw new Error("DOCUMENT_ENCRYPTION_KEY not configured");
    }

    const password = decrypt(conn.sagePassEncrypted, encryptionKey);
    return { username: conn.sageUsername, password };
  }
}
