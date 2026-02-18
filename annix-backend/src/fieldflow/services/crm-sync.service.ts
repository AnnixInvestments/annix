import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO, now } from "../../lib/datetime";
import { decrypt, encrypt } from "../../secure-documents/crypto.util";
import {
  HubSpotAdapter,
  PipedriveAdapter,
  type PullContactsResult,
  type PullMeetingsResult,
  SalesforceAdapter,
} from "../adapters";
import type { CrmAdapterConfig, CrmContactData } from "../adapters/crm-adapter.interface";
import {
  ConflictResolutionStrategy,
  CrmConfig,
  CrmSyncLog,
  CrmType,
  Prospect,
  ProspectStatus,
  SyncDirection,
  type SyncErrorDetail,
  SyncStatus,
} from "../entities";
import {
  HubSpotOAuthProvider,
  PipedriveOAuthProvider,
  SalesforceOAuthProvider,
} from "../providers";
import type { CrmOAuthConfig } from "../providers/crm-oauth-provider.interface";

export interface SyncConflict {
  id: number;
  prospectId: number;
  configId: number;
  localData: CrmContactData;
  remoteData: CrmContactData;
  localUpdatedAt: Date;
  remoteUpdatedAt: Date;
  createdAt: Date;
}

interface OAuthAdapter {
  configureOAuth: (oauthConfig: CrmOAuthConfig, adapterConfig: CrmAdapterConfig) => void;
  pullContacts: (since: Date | null) => Promise<PullContactsResult>;
  pullMeetings: (since: Date | null) => Promise<PullMeetingsResult>;
  testConnection: () => Promise<{ success: boolean; message: string }>;
}

@Injectable()
export class CrmSyncService {
  private readonly logger = new Logger(CrmSyncService.name);
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(CrmConfig)
    private readonly crmConfigRepo: Repository<CrmConfig>,
    @InjectRepository(CrmSyncLog)
    private readonly syncLogRepo: Repository<CrmSyncLog>,
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
    private readonly configService: ConfigService,
    private readonly salesforceProvider: SalesforceOAuthProvider,
    private readonly hubspotProvider: HubSpotOAuthProvider,
    private readonly pipedriveProvider: PipedriveOAuthProvider,
  ) {
    this.encryptionKey = this.configService.get<string>("TOKEN_ENCRYPTION_KEY") ?? "";
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runScheduledSync(): Promise<void> {
    this.logger.log("Running scheduled CRM sync");

    const activeConfigs = await this.crmConfigRepo.find({
      where: { isActive: true },
    });

    const oauthConfigs = activeConfigs.filter((config) =>
      [CrmType.SALESFORCE, CrmType.HUBSPOT, CrmType.PIPEDRIVE].includes(config.crmType),
    );

    for (const config of oauthConfigs) {
      try {
        await this.syncIncrementally(config.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        this.logger.error(`Scheduled sync failed for config ${config.id}: ${errorMessage}`);
      }
    }
  }

  async syncIncrementally(configId: number): Promise<CrmSyncLog> {
    const config = await this.crmConfigRepo.findOne({ where: { id: configId } });
    if (!config) {
      throw new NotFoundException(`CRM config ${configId} not found`);
    }

    const syncLog = await this.createSyncLog(configId, SyncDirection.PULL);

    try {
      const adapter = await this.oauthAdapterForConfig(config);

      const sinceDate = config.lastPullSyncToken
        ? fromISO(config.lastPullSyncToken).toJSDate()
        : null;

      if (config.syncProspects) {
        const contactsResult = await adapter.pullContacts(sinceDate);
        await this.processIncomingContacts(config, contactsResult.contacts, syncLog);

        if (contactsResult.nextSyncToken) {
          config.lastPullSyncToken = contactsResult.nextSyncToken;
        }
      }

      config.lastSyncAt = now().toJSDate();
      config.lastSyncError = null;
      await this.crmConfigRepo.save(config);

      syncLog.status = syncLog.recordsFailed > 0 ? SyncStatus.PARTIAL : SyncStatus.COMPLETED;
      syncLog.completedAt = now().toJSDate();
      await this.syncLogRepo.save(syncLog);

      return syncLog;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Incremental sync failed for config ${configId}: ${errorMessage}`);

      syncLog.status = SyncStatus.FAILED;
      syncLog.completedAt = now().toJSDate();
      syncLog.errorDetails = [
        {
          recordId: "sync",
          recordType: "prospect",
          error: errorMessage,
          timestamp: now().toISO()!,
        },
      ];
      await this.syncLogRepo.save(syncLog);

      config.lastSyncError = errorMessage;
      await this.crmConfigRepo.save(config);

      throw error;
    }
  }

  async pullAllContacts(configId: number): Promise<CrmSyncLog> {
    const config = await this.crmConfigRepo.findOne({ where: { id: configId } });
    if (!config) {
      throw new NotFoundException(`CRM config ${configId} not found`);
    }

    const syncLog = await this.createSyncLog(configId, SyncDirection.PULL);

    try {
      const adapter = await this.oauthAdapterForConfig(config);

      const contactsResult = await adapter.pullContacts(null);
      await this.processIncomingContacts(config, contactsResult.contacts, syncLog);

      if (contactsResult.nextSyncToken) {
        config.lastPullSyncToken = contactsResult.nextSyncToken;
      }

      config.lastSyncAt = now().toJSDate();
      config.lastSyncError = null;
      await this.crmConfigRepo.save(config);

      syncLog.status = syncLog.recordsFailed > 0 ? SyncStatus.PARTIAL : SyncStatus.COMPLETED;
      syncLog.completedAt = now().toJSDate();
      await this.syncLogRepo.save(syncLog);

      return syncLog;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Pull all contacts failed for config ${configId}: ${errorMessage}`);

      syncLog.status = SyncStatus.FAILED;
      syncLog.completedAt = now().toJSDate();
      await this.syncLogRepo.save(syncLog);

      throw error;
    }
  }

  async syncLogs(
    configId: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ logs: CrmSyncLog[]; total: number }> {
    const [logs, total] = await this.syncLogRepo.findAndCount({
      where: { configId },
      order: { startedAt: "DESC" },
      take: limit,
      skip: offset,
    });

    return { logs, total };
  }

  async refreshTokenIfNeeded(configId: number): Promise<void> {
    const config = await this.crmConfigRepo.findOne({ where: { id: configId } });
    if (!config) {
      throw new NotFoundException(`CRM config ${configId} not found`);
    }

    if (!config.tokenExpiresAt) {
      return;
    }

    const expiresAt = fromISO(config.tokenExpiresAt.toISOString());
    const nowTime = now();
    const fiveMinutesFromNow = nowTime.plus({ minutes: 5 });

    if (expiresAt > fiveMinutesFromNow) {
      return;
    }

    if (!config.refreshTokenEncrypted) {
      throw new Error("No refresh token available");
    }

    const refreshToken = decrypt(
      Buffer.from(config.refreshTokenEncrypted, "base64"),
      this.encryptionKey,
    ).toString();

    let tokenResponse;
    switch (config.crmType) {
      case CrmType.SALESFORCE:
        tokenResponse = await this.salesforceProvider.refreshAccessToken(refreshToken);
        break;
      case CrmType.HUBSPOT:
        tokenResponse = await this.hubspotProvider.refreshAccessToken(refreshToken);
        break;
      case CrmType.PIPEDRIVE:
        tokenResponse = await this.pipedriveProvider.refreshAccessToken(refreshToken);
        break;
      default:
        return;
    }

    config.apiKeyEncrypted = encrypt(tokenResponse.accessToken, this.encryptionKey).toString(
      "base64",
    );
    if (tokenResponse.refreshToken) {
      config.refreshTokenEncrypted = encrypt(
        tokenResponse.refreshToken,
        this.encryptionKey,
      ).toString("base64");
    }
    config.tokenExpiresAt = now().plus({ seconds: tokenResponse.expiresIn }).toJSDate();
    if (tokenResponse.instanceUrl) {
      config.instanceUrl = tokenResponse.instanceUrl;
    }

    await this.crmConfigRepo.save(config);
    this.logger.log(`Refreshed OAuth token for config ${configId}`);
  }

  private async createSyncLog(configId: number, direction: SyncDirection): Promise<CrmSyncLog> {
    const syncLog = this.syncLogRepo.create({
      configId,
      direction,
      status: SyncStatus.IN_PROGRESS,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
    });

    return this.syncLogRepo.save(syncLog);
  }

  private async oauthAdapterForConfig(config: CrmConfig): Promise<OAuthAdapter> {
    await this.refreshTokenIfNeeded(config.id);

    const reloadedConfig = await this.crmConfigRepo.findOne({ where: { id: config.id } });
    if (!reloadedConfig) {
      throw new Error("Config not found after token refresh");
    }

    if (!reloadedConfig.apiKeyEncrypted) {
      throw new Error("No access token configured");
    }

    const accessToken = decrypt(
      Buffer.from(reloadedConfig.apiKeyEncrypted, "base64"),
      this.encryptionKey,
    ).toString();

    const oauthConfig = {
      accessToken,
      refreshToken: null,
      instanceUrl: reloadedConfig.instanceUrl,
    };

    const baseAdapterConfig = {
      name: reloadedConfig.name,
      enabled: reloadedConfig.isActive,
      fieldMappings: [],
      syncContacts: reloadedConfig.syncProspects,
      syncMeetings: reloadedConfig.syncMeetings,
      autoSync: reloadedConfig.syncOnCreate || reloadedConfig.syncOnUpdate,
    };

    switch (reloadedConfig.crmType) {
      case CrmType.SALESFORCE: {
        const adapter = new SalesforceAdapter();
        const adapterConfig: CrmAdapterConfig = { ...baseAdapterConfig, type: "salesforce" };
        adapter.configureOAuth(oauthConfig, adapterConfig);
        return adapter;
      }
      case CrmType.HUBSPOT: {
        const adapter = new HubSpotAdapter();
        const adapterConfig: CrmAdapterConfig = { ...baseAdapterConfig, type: "hubspot" };
        adapter.configureOAuth(oauthConfig, adapterConfig);
        return adapter;
      }
      case CrmType.PIPEDRIVE: {
        const adapter = new PipedriveAdapter();
        const adapterConfig: CrmAdapterConfig = { ...baseAdapterConfig, type: "pipedrive" };
        adapter.configureOAuth(oauthConfig, adapterConfig);
        return adapter;
      }
      default:
        throw new Error(`Unsupported CRM type for OAuth: ${reloadedConfig.crmType}`);
    }
  }

  private async processIncomingContacts(
    config: CrmConfig,
    contacts: CrmContactData[],
    syncLog: CrmSyncLog,
  ): Promise<void> {
    const errors: SyncErrorDetail[] = [];

    for (const contact of contacts) {
      syncLog.recordsProcessed++;

      try {
        const existingProspect = contact.externalId
          ? await this.prospectRepo.findOne({
              where: { crmExternalId: contact.externalId, ownerId: config.userId },
            })
          : null;

        if (existingProspect) {
          const shouldUpdate = this.shouldUpdateLocal(config, existingProspect, contact);

          if (shouldUpdate) {
            await this.updateProspectFromContact(existingProspect, contact);
            syncLog.recordsSucceeded++;
          } else {
            syncLog.recordsSucceeded++;
          }
        } else {
          await this.createProspectFromContact(config.userId, contact);
          syncLog.recordsSucceeded++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({
          recordId: contact.externalId ?? "unknown",
          recordType: "prospect",
          error: errorMessage,
          timestamp: now().toISO()!,
        });
        syncLog.recordsFailed++;
      }
    }

    if (errors.length > 0) {
      syncLog.errorDetails = errors;
    }

    await this.syncLogRepo.save(syncLog);
  }

  private shouldUpdateLocal(
    config: CrmConfig,
    existingProspect: Prospect,
    contact: CrmContactData,
  ): boolean {
    switch (config.conflictResolution) {
      case ConflictResolutionStrategy.REMOTE_WINS:
        return true;
      case ConflictResolutionStrategy.LOCAL_WINS:
        return false;
      case ConflictResolutionStrategy.NEWEST_WINS:
        return true;
      default:
        return true;
    }
  }

  private async updateProspectFromContact(
    prospect: Prospect,
    contact: CrmContactData,
  ): Promise<void> {
    if (contact.contactName) {
      prospect.contactName = contact.contactName;
    }
    if (contact.email) {
      prospect.contactEmail = contact.email;
    }
    if (contact.phone) {
      prospect.contactPhone = contact.phone;
    }
    if (contact.address) {
      prospect.streetAddress = contact.address;
    }
    if (contact.city) {
      prospect.city = contact.city;
    }
    if (contact.state) {
      prospect.province = contact.state;
    }
    if (contact.postalCode) {
      prospect.postalCode = contact.postalCode;
    }
    if (contact.country) {
      prospect.country = contact.country;
    }
    if (contact.notes) {
      prospect.notes = contact.notes;
    }

    prospect.crmSyncStatus = "synced";
    prospect.crmLastSyncedAt = now().toJSDate();

    await this.prospectRepo.save(prospect);
  }

  private async createProspectFromContact(
    userId: number,
    contact: CrmContactData,
  ): Promise<Prospect> {
    const prospect = this.prospectRepo.create({
      ownerId: userId,
      companyName: contact.companyName,
      contactName: contact.contactName,
      contactEmail: contact.email,
      contactPhone: contact.phone,
      streetAddress: contact.address,
      city: contact.city,
      province: contact.state,
      postalCode: contact.postalCode,
      country: contact.country ?? "South Africa",
      notes: contact.notes,
      status: this.mapContactStatusToProspectStatus(contact.status),
      crmExternalId: contact.externalId ?? null,
      crmSyncStatus: "synced",
      crmLastSyncedAt: now().toJSDate(),
    });

    return this.prospectRepo.save(prospect);
  }

  private mapContactStatusToProspectStatus(status: string): ProspectStatus {
    const statusMap: Record<string, ProspectStatus> = {
      new: ProspectStatus.NEW,
      contacted: ProspectStatus.CONTACTED,
      qualified: ProspectStatus.QUALIFIED,
      proposal: ProspectStatus.PROPOSAL,
      won: ProspectStatus.WON,
      lost: ProspectStatus.LOST,
    };
    return statusMap[status] ?? ProspectStatus.NEW;
  }
}
