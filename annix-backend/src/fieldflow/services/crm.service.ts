import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { decrypt, encrypt } from "../../secure-documents/crypto.util";
import {
  type CrmAdapterConfig,
  type CrmSyncResult,
  CsvExportAdapter,
  HubSpotAdapter,
  type ICrmAdapter,
  PipedriveAdapter,
  SalesforceAdapter,
  WebhookCrmAdapter,
} from "../adapters";
import { CreateCrmConfigDto, UpdateCrmConfigDto } from "../dto";
import {
  CrmConfig,
  CrmType,
  Meeting,
  MeetingRecording,
  MeetingTranscript,
  Prospect,
} from "../entities";
import {
  type CrmOAuthTokenResponse,
  HubSpotOAuthProvider,
  PipedriveOAuthProvider,
  SalesforceOAuthProvider,
} from "../providers";

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(CrmConfig)
    private readonly crmConfigRepo: Repository<CrmConfig>,
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingRecording)
    private readonly recordingRepo: Repository<MeetingRecording>,
    @InjectRepository(MeetingTranscript)
    private readonly transcriptRepo: Repository<MeetingTranscript>,
    private readonly configService: ConfigService,
    private readonly salesforceProvider: SalesforceOAuthProvider,
    private readonly hubspotProvider: HubSpotOAuthProvider,
    private readonly pipedriveProvider: PipedriveOAuthProvider,
  ) {
    this.encryptionKey = this.configService.get<string>("TOKEN_ENCRYPTION_KEY") ?? "";
  }

  private encryptValue(value: string): string {
    return encrypt(value, this.encryptionKey).toString("base64");
  }

  private decryptValue(encryptedValue: string): string {
    return decrypt(Buffer.from(encryptedValue, "base64"), this.encryptionKey).toString();
  }

  oauthUrl(provider: CrmType, redirectUri: string, state: string): string {
    switch (provider) {
      case CrmType.SALESFORCE:
        return this.salesforceProvider.oauthUrl(redirectUri, state);
      case CrmType.HUBSPOT:
        return this.hubspotProvider.oauthUrl(redirectUri, state);
      case CrmType.PIPEDRIVE:
        return this.pipedriveProvider.oauthUrl(redirectUri, state);
      default:
        throw new Error(`OAuth not supported for ${provider}`);
    }
  }

  async handleOAuthCallback(
    userId: number,
    provider: CrmType,
    code: string,
    redirectUri: string,
  ): Promise<CrmConfig> {
    let tokenResponse: CrmOAuthTokenResponse;

    switch (provider) {
      case CrmType.SALESFORCE:
        tokenResponse = await this.salesforceProvider.exchangeCode(code, redirectUri);
        break;
      case CrmType.HUBSPOT:
        tokenResponse = await this.hubspotProvider.exchangeCode(code, redirectUri);
        break;
      case CrmType.PIPEDRIVE:
        tokenResponse = await this.pipedriveProvider.exchangeCode(code, redirectUri);
        break;
      default:
        throw new Error(`OAuth not supported for ${provider}`);
    }

    const userInfo = await this.oauthUserInfo(provider, tokenResponse);

    const existingConfig = await this.crmConfigRepo.findOne({
      where: { userId, crmType: provider },
    });

    if (existingConfig) {
      existingConfig.apiKeyEncrypted = this.encryptValue(tokenResponse.accessToken);
      existingConfig.refreshTokenEncrypted = tokenResponse.refreshToken
        ? this.encryptValue(tokenResponse.refreshToken)
        : null;
      existingConfig.instanceUrl = tokenResponse.instanceUrl;
      existingConfig.tokenExpiresAt = now().plus({ seconds: tokenResponse.expiresIn }).toJSDate();
      existingConfig.crmUserId = userInfo.id;
      existingConfig.crmOrganizationId = userInfo.organizationId;
      existingConfig.isActive = true;

      return this.crmConfigRepo.save(existingConfig);
    }

    const config = this.crmConfigRepo.create({
      userId,
      name: this.defaultConfigName(provider),
      crmType: provider,
      apiKeyEncrypted: this.encryptValue(tokenResponse.accessToken),
      refreshTokenEncrypted: tokenResponse.refreshToken
        ? this.encryptValue(tokenResponse.refreshToken)
        : null,
      instanceUrl: tokenResponse.instanceUrl,
      tokenExpiresAt: now().plus({ seconds: tokenResponse.expiresIn }).toJSDate(),
      crmUserId: userInfo.id,
      crmOrganizationId: userInfo.organizationId,
      isActive: true,
      syncProspects: true,
      syncMeetings: true,
      syncOnCreate: true,
      syncOnUpdate: true,
    });

    return this.crmConfigRepo.save(config);
  }

  async disconnectOAuth(userId: number, configId: number): Promise<void> {
    const config = await this.configById(userId, configId);

    if (config.apiKeyEncrypted) {
      const accessToken = this.decryptValue(config.apiKeyEncrypted);

      try {
        switch (config.crmType) {
          case CrmType.SALESFORCE:
            await this.salesforceProvider.revokeToken(accessToken);
            break;
          case CrmType.HUBSPOT:
            await this.hubspotProvider.revokeToken(accessToken);
            break;
          case CrmType.PIPEDRIVE:
            await this.pipedriveProvider.revokeToken(accessToken);
            break;
        }
      } catch (error) {
        this.logger.warn(`Failed to revoke token for config ${configId}: ${error}`);
      }
    }

    config.apiKeyEncrypted = null;
    config.refreshTokenEncrypted = null;
    config.tokenExpiresAt = null;
    config.isActive = false;

    await this.crmConfigRepo.save(config);
    this.logger.log(`Disconnected OAuth for config ${configId}`);
  }

  private async oauthUserInfo(
    provider: CrmType,
    tokenResponse: CrmOAuthTokenResponse,
  ): Promise<{ id: string; organizationId: string | null }> {
    const oauthConfig = {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      instanceUrl: tokenResponse.instanceUrl,
    };

    switch (provider) {
      case CrmType.SALESFORCE: {
        const info = await this.salesforceProvider.userInfo(oauthConfig);
        return { id: info.id, organizationId: info.organizationId };
      }
      case CrmType.HUBSPOT: {
        const info = await this.hubspotProvider.userInfo(oauthConfig);
        return { id: info.id, organizationId: info.organizationId };
      }
      case CrmType.PIPEDRIVE: {
        const info = await this.pipedriveProvider.userInfo(oauthConfig);
        return { id: info.id, organizationId: info.organizationId };
      }
      default:
        return { id: "unknown", organizationId: null };
    }
  }

  private defaultConfigName(provider: CrmType): string {
    const names: Record<string, string> = {
      [CrmType.SALESFORCE]: "Salesforce",
      [CrmType.HUBSPOT]: "HubSpot",
      [CrmType.PIPEDRIVE]: "Pipedrive",
    };
    return names[provider] ?? "CRM Integration";
  }

  async listConfigs(userId: number): Promise<CrmConfig[]> {
    return this.crmConfigRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  async configById(userId: number, configId: number): Promise<CrmConfig> {
    const config = await this.crmConfigRepo.findOne({
      where: { id: configId, userId },
    });

    if (!config) {
      throw new NotFoundException(`CRM config ${configId} not found`);
    }

    return config;
  }

  async createConfig(userId: number, dto: CreateCrmConfigDto): Promise<CrmConfig> {
    const config = this.crmConfigRepo.create({
      userId,
      name: dto.name,
      crmType: dto.crmType,
      webhookConfig: dto.webhookConfig ?? null,
      apiKeyEncrypted: dto.apiKey ? this.encryptValue(dto.apiKey) : null,
      apiSecretEncrypted: dto.apiSecret ? this.encryptValue(dto.apiSecret) : null,
      instanceUrl: dto.instanceUrl ?? null,
      prospectFieldMappings: dto.prospectFieldMappings ?? null,
      meetingFieldMappings: dto.meetingFieldMappings ?? null,
      syncProspects: dto.syncProspects ?? true,
      syncMeetings: dto.syncMeetings ?? true,
      syncOnCreate: dto.syncOnCreate ?? true,
      syncOnUpdate: dto.syncOnUpdate ?? true,
      isActive: true,
    });

    const saved = await this.crmConfigRepo.save(config);
    this.logger.log(`CRM config created: ${saved.id} by user ${userId}`);
    return saved;
  }

  async updateConfig(
    userId: number,
    configId: number,
    dto: UpdateCrmConfigDto,
  ): Promise<CrmConfig> {
    const config = await this.configById(userId, configId);

    if (dto.name !== undefined) {
      config.name = dto.name;
    }
    if (dto.crmType !== undefined) {
      config.crmType = dto.crmType;
    }
    if (dto.webhookConfig !== undefined) {
      config.webhookConfig = dto.webhookConfig ?? null;
    }
    if (dto.apiKey !== undefined) {
      config.apiKeyEncrypted = dto.apiKey ? this.encryptValue(dto.apiKey) : null;
    }
    if (dto.apiSecret !== undefined) {
      config.apiSecretEncrypted = dto.apiSecret ? this.encryptValue(dto.apiSecret) : null;
    }
    if (dto.instanceUrl !== undefined) {
      config.instanceUrl = dto.instanceUrl ?? null;
    }
    if (dto.prospectFieldMappings !== undefined) {
      config.prospectFieldMappings = dto.prospectFieldMappings ?? null;
    }
    if (dto.meetingFieldMappings !== undefined) {
      config.meetingFieldMappings = dto.meetingFieldMappings ?? null;
    }
    if (dto.syncProspects !== undefined) {
      config.syncProspects = dto.syncProspects;
    }
    if (dto.syncMeetings !== undefined) {
      config.syncMeetings = dto.syncMeetings;
    }
    if (dto.syncOnCreate !== undefined) {
      config.syncOnCreate = dto.syncOnCreate;
    }
    if (dto.syncOnUpdate !== undefined) {
      config.syncOnUpdate = dto.syncOnUpdate;
    }
    if (dto.isActive !== undefined) {
      config.isActive = dto.isActive;
    }

    const saved = await this.crmConfigRepo.save(config);
    this.logger.log(`CRM config updated: ${saved.id}`);
    return saved;
  }

  async deleteConfig(userId: number, configId: number): Promise<void> {
    const config = await this.configById(userId, configId);
    await this.crmConfigRepo.remove(config);
    this.logger.log(`CRM config deleted: ${configId}`);
  }

  async testConnection(
    userId: number,
    configId: number,
  ): Promise<{ success: boolean; message: string }> {
    const config = await this.configById(userId, configId);
    const adapter = this.adapterForConfig(config);

    return adapter.testConnection();
  }

  async syncProspect(userId: number, configId: number, prospectId: number): Promise<CrmSyncResult> {
    const config = await this.configById(userId, configId);
    const prospect = await this.prospectRepo.findOne({
      where: { id: prospectId, ownerId: userId },
    });

    if (!prospect) {
      throw new NotFoundException(`Prospect ${prospectId} not found`);
    }

    const adapter = this.adapterForConfig(config);
    const result = await adapter.syncContact(prospect);

    if (result.success && result.externalId) {
      prospect.crmExternalId = result.externalId;
      await this.prospectRepo.save(prospect);
    }

    await this.updateSyncStatus(config, result);
    return result;
  }

  async syncMeeting(userId: number, configId: number, meetingId: number): Promise<CrmSyncResult> {
    const config = await this.configById(userId, configId);
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId, salesRepId: userId },
      relations: ["prospect"],
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${meetingId} not found`);
    }

    if (!meeting.prospect) {
      throw new NotFoundException(`Meeting ${meetingId} has no associated prospect`);
    }

    const recording = await this.recordingRepo.findOne({
      where: { meetingId },
    });

    const transcript = recording
      ? await this.transcriptRepo.findOne({
          where: { recordingId: recording.id },
        })
      : null;

    const summary = transcript?.analysis
      ? {
          overview: transcript.summary ?? null,
          keyPoints: transcript.analysis.keyPoints ?? [],
          actionItems: transcript.analysis.actionItems ?? [],
          nextSteps: [],
        }
      : null;

    const adapter = this.adapterForConfig(config);
    const result = await (adapter as WebhookCrmAdapter).syncMeeting(
      meeting,
      meeting.prospect,
      summary,
    );

    if (result.success && result.externalId) {
      meeting.crmExternalId = result.externalId;
      await this.meetingRepo.save(meeting);
    }

    await this.updateSyncStatus(config, result);
    return result;
  }

  async syncAllProspects(
    userId: number,
    configId: number,
  ): Promise<{ synced: number; failed: number }> {
    const config = await this.configById(userId, configId);
    const prospects = await this.prospectRepo.find({
      where: { ownerId: userId },
    });

    const adapter = this.adapterForConfig(config);
    let synced = 0;
    let failed = 0;

    for (const prospect of prospects) {
      const result = await adapter.syncContact(prospect);
      if (result.success) {
        if (result.externalId) {
          prospect.crmExternalId = result.externalId;
          await this.prospectRepo.save(prospect);
        }
        synced++;
      } else {
        failed++;
        this.logger.warn(`Failed to sync prospect ${prospect.id}: ${result.error}`);
      }
    }

    config.lastSyncAt = now().toJSDate();
    config.lastSyncError = failed > 0 ? `${failed} prospects failed to sync` : null;
    await this.crmConfigRepo.save(config);

    return { synced, failed };
  }

  async exportProspectsCsv(userId: number, configId: number | null): Promise<string> {
    const config = configId ? await this.configById(userId, configId) : null;
    const prospects = await this.prospectRepo.find({
      where: { ownerId: userId },
      order: { createdAt: "DESC" },
    });

    const csvAdapter = new CsvExportAdapter();
    if (config) {
      csvAdapter.configure({
        type: "csv",
        name: config.name,
        enabled: true,
        fieldMappings: (config.prospectFieldMappings ?? []).map((m) => ({
          sourceField: m.sourceField,
          targetField: m.targetField,
          transform: m.transform as CrmAdapterConfig["fieldMappings"][0]["transform"],
        })),
        syncContacts: true,
        syncMeetings: false,
        autoSync: false,
      });
    }

    return csvAdapter.exportProspects(prospects);
  }

  async exportMeetingsCsv(userId: number, configId: number | null): Promise<string> {
    const config = configId ? await this.configById(userId, configId) : null;
    const meetings = await this.meetingRepo.find({
      where: { salesRepId: userId },
      relations: ["prospect"],
      order: { scheduledStart: "DESC" },
    });

    const meetingsWithSummaries = await Promise.all(
      meetings.map(async (meeting) => {
        const recording = await this.recordingRepo.findOne({
          where: { meetingId: meeting.id },
        });
        const transcript = recording
          ? await this.transcriptRepo.findOne({
              where: { recordingId: recording.id },
            })
          : null;

        const summary = transcript?.analysis
          ? {
              overview: transcript.summary ?? null,
              keyPoints: transcript.analysis.keyPoints ?? [],
              actionItems: transcript.analysis.actionItems ?? [],
              nextSteps: [],
            }
          : null;

        return { meeting, prospect: meeting.prospect!, summary };
      }),
    );

    const validMeetings = meetingsWithSummaries.filter((m) => m.prospect);

    const csvAdapter = new CsvExportAdapter();
    if (config) {
      csvAdapter.configure({
        type: "csv",
        name: config.name,
        enabled: true,
        fieldMappings: (config.meetingFieldMappings ?? []).map((m) => ({
          sourceField: m.sourceField,
          targetField: m.targetField,
          transform: m.transform as CrmAdapterConfig["fieldMappings"][0]["transform"],
        })),
        syncContacts: false,
        syncMeetings: true,
        autoSync: false,
      });
    }

    return csvAdapter.exportMeetings(validMeetings);
  }

  async syncStatus(
    userId: number,
    configId: number,
  ): Promise<{
    configId: number;
    isActive: boolean;
    lastSyncAt: Date | null;
    prospectsSynced: number;
    meetingsSynced: number;
    pendingSync: number;
    failedSync: number;
  }> {
    const config = await this.configById(userId, configId);

    const [prospectsSynced, meetingsSynced, totalProspects, totalMeetings] = await Promise.all([
      this.prospectRepo.count({
        where: { ownerId: userId, crmExternalId: Not(IsNull()) },
      }),
      this.meetingRepo.count({
        where: { salesRepId: userId, crmExternalId: Not(IsNull()) },
      }),
      this.prospectRepo.count({ where: { ownerId: userId } }),
      this.meetingRepo.count({ where: { salesRepId: userId } }),
    ]);

    return {
      configId: config.id,
      isActive: config.isActive,
      lastSyncAt: config.lastSyncAt,
      prospectsSynced,
      meetingsSynced,
      pendingSync: totalProspects - prospectsSynced + (totalMeetings - meetingsSynced),
      failedSync: config.lastSyncError ? 1 : 0,
    };
  }

  private adapterForConfig(config: CrmConfig): ICrmAdapter {
    const adapterConfig: CrmAdapterConfig = {
      type: config.crmType === CrmType.WEBHOOK ? "webhook" : "csv",
      name: config.name,
      enabled: config.isActive,
      webhookUrl: config.webhookConfig?.url,
      webhookHeaders: config.webhookConfig?.headers,
      webhookMethod: config.webhookConfig?.method,
      fieldMappings: [
        ...(config.prospectFieldMappings ?? []).map((m) => ({
          sourceField: m.sourceField,
          targetField: m.targetField,
          transform: m.transform as CrmAdapterConfig["fieldMappings"][0]["transform"],
        })),
        ...(config.meetingFieldMappings ?? []).map((m) => ({
          sourceField: m.sourceField,
          targetField: m.targetField,
          transform: m.transform as CrmAdapterConfig["fieldMappings"][0]["transform"],
        })),
      ],
      syncContacts: config.syncProspects,
      syncMeetings: config.syncMeetings,
      autoSync: config.syncOnCreate || config.syncOnUpdate,
    };

    if ([CrmType.SALESFORCE, CrmType.HUBSPOT, CrmType.PIPEDRIVE].includes(config.crmType)) {
      return this.oauthAdapterForConfig(config, adapterConfig);
    }

    if (config.crmType === CrmType.WEBHOOK) {
      const adapter = new WebhookCrmAdapter();
      adapter.configure(adapterConfig);
      return adapter;
    }

    const adapter = new CsvExportAdapter();
    adapter.configure({ ...adapterConfig, type: "csv" });
    return adapter;
  }

  private oauthAdapterForConfig(config: CrmConfig, adapterConfig: CrmAdapterConfig): ICrmAdapter {
    if (!config.apiKeyEncrypted) {
      throw new Error(`No access token configured for ${config.name}`);
    }

    const accessToken = this.decryptValue(config.apiKeyEncrypted);
    const oauthConfig = {
      accessToken,
      refreshToken: null,
      instanceUrl: config.instanceUrl,
    };

    switch (config.crmType) {
      case CrmType.SALESFORCE: {
        const adapter = new SalesforceAdapter();
        adapter.configureOAuth(oauthConfig, adapterConfig);
        return adapter;
      }
      case CrmType.HUBSPOT: {
        const adapter = new HubSpotAdapter();
        adapter.configureOAuth(oauthConfig, adapterConfig);
        return adapter;
      }
      case CrmType.PIPEDRIVE: {
        const adapter = new PipedriveAdapter();
        adapter.configureOAuth(oauthConfig, adapterConfig);
        return adapter;
      }
      default:
        throw new Error(`Unsupported OAuth CRM type: ${config.crmType}`);
    }
  }

  private async updateSyncStatus(config: CrmConfig, result: CrmSyncResult): Promise<void> {
    config.lastSyncAt = now().toJSDate();
    config.lastSyncError = result.success ? null : (result.error ?? "Unknown error");
    await this.crmConfigRepo.save(config);
  }
}
