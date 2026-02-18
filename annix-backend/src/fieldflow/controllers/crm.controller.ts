import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AnnixRepAuthGuard } from "../auth";
import {
  CreateCrmConfigDto,
  CrmConfigResponseDto,
  CrmSyncLogResponseDto,
  CrmSyncStatusDto,
  SyncResultDto,
  UpdateCrmConfigDto,
} from "../dto";
import { CrmType } from "../entities";
import { CrmService } from "../services/crm.service";
import { CrmSyncService } from "../services/crm-sync.service";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Rep - CRM")
@Controller("annix-rep/crm")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly crmSyncService: CrmSyncService,
  ) {}

  @Get("configs")
  @ApiOperation({ summary: "List all CRM configurations" })
  @ApiResponse({ status: 200, type: [CrmConfigResponseDto] })
  async listConfigs(@Req() req: AnnixRepRequest): Promise<CrmConfigResponseDto[]> {
    const configs = await this.crmService.listConfigs(req.annixRepUser.userId);
    return configs.map((config) => this.toConfigResponse(config));
  }

  @Get("configs/:id")
  @ApiOperation({ summary: "Get CRM configuration by ID" })
  @ApiResponse({ status: 200, type: CrmConfigResponseDto })
  async configById(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<CrmConfigResponseDto> {
    const config = await this.crmService.configById(req.annixRepUser.userId, id);
    return this.toConfigResponse(config);
  }

  @Post("configs")
  @ApiOperation({ summary: "Create new CRM configuration" })
  @ApiResponse({ status: 201, type: CrmConfigResponseDto })
  async createConfig(
    @Req() req: AnnixRepRequest,
    @Body() dto: CreateCrmConfigDto,
  ): Promise<CrmConfigResponseDto> {
    const config = await this.crmService.createConfig(req.annixRepUser.userId, dto);
    return this.toConfigResponse(config);
  }

  @Patch("configs/:id")
  @ApiOperation({ summary: "Update CRM configuration" })
  @ApiResponse({ status: 200, type: CrmConfigResponseDto })
  async updateConfig(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCrmConfigDto,
  ): Promise<CrmConfigResponseDto> {
    const config = await this.crmService.updateConfig(req.annixRepUser.userId, id, dto);
    return this.toConfigResponse(config);
  }

  @Delete("configs/:id")
  @ApiOperation({ summary: "Delete CRM configuration" })
  @ApiResponse({ status: 204 })
  async deleteConfig(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<void> {
    await this.crmService.deleteConfig(req.annixRepUser.userId, id);
  }

  @Post("configs/:id/test")
  @ApiOperation({ summary: "Test CRM connection" })
  @ApiResponse({ status: 200 })
  async testConnection(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ success: boolean; message: string }> {
    return this.crmService.testConnection(req.annixRepUser.userId, id);
  }

  @Post("configs/:id/sync/prospect/:prospectId")
  @ApiOperation({ summary: "Sync a specific prospect to CRM" })
  @ApiResponse({ status: 200, type: SyncResultDto })
  async syncProspect(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Param("prospectId", ParseIntPipe) prospectId: number,
  ): Promise<SyncResultDto> {
    const result = await this.crmService.syncProspect(req.annixRepUser.userId, id, prospectId);
    return {
      success: result.success,
      message: result.success ? "Synced successfully" : null,
      externalId: result.externalId ?? null,
      error: result.error ?? null,
    };
  }

  @Post("configs/:id/sync/meeting/:meetingId")
  @ApiOperation({ summary: "Sync a specific meeting to CRM" })
  @ApiResponse({ status: 200, type: SyncResultDto })
  async syncMeeting(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Param("meetingId", ParseIntPipe) meetingId: number,
  ): Promise<SyncResultDto> {
    const result = await this.crmService.syncMeeting(req.annixRepUser.userId, id, meetingId);
    return {
      success: result.success,
      message: result.success ? "Synced successfully" : null,
      externalId: result.externalId ?? null,
      error: result.error ?? null,
    };
  }

  @Post("configs/:id/sync/all-prospects")
  @ApiOperation({ summary: "Sync all prospects to CRM" })
  @ApiResponse({ status: 200 })
  async syncAllProspects(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ synced: number; failed: number }> {
    return this.crmService.syncAllProspects(req.annixRepUser.userId, id);
  }

  @Get("configs/:id/status")
  @ApiOperation({ summary: "Get CRM sync status" })
  @ApiResponse({ status: 200, type: CrmSyncStatusDto })
  async syncStatus(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<CrmSyncStatusDto> {
    return this.crmService.syncStatus(req.annixRepUser.userId, id);
  }

  @Get("export/prospects")
  @ApiOperation({ summary: "Export prospects as CSV" })
  @ApiQuery({ name: "configId", required: false })
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", "attachment; filename=prospects.csv")
  async exportProspects(
    @Req() req: AnnixRepRequest,
    @Query("configId") configId?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const csv = await this.crmService.exportProspectsCsv(
      req.annixRepUser.userId,
      configId ? parseInt(configId, 10) : null,
    );
    res?.send(csv);
  }

  @Get("export/meetings")
  @ApiOperation({ summary: "Export meetings as CSV" })
  @ApiQuery({ name: "configId", required: false })
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", "attachment; filename=meetings.csv")
  async exportMeetings(
    @Req() req: AnnixRepRequest,
    @Query("configId") configId?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const csv = await this.crmService.exportMeetingsCsv(
      req.annixRepUser.userId,
      configId ? parseInt(configId, 10) : null,
    );
    res?.send(csv);
  }

  @Get("oauth/:provider/url")
  @ApiOperation({ summary: "Get OAuth authorization URL for a CRM provider" })
  @ApiParam({ name: "provider", enum: ["salesforce", "hubspot", "pipedrive"] })
  @ApiQuery({ name: "redirectUri", required: true })
  @ApiResponse({ status: 200 })
  async oauthUrl(
    @Param("provider") provider: string,
    @Query("redirectUri") redirectUri: string,
    @Req() req: AnnixRepRequest,
  ): Promise<{ url: string }> {
    const crmType = this.parseCrmProvider(provider);
    const state = Buffer.from(
      JSON.stringify({ userId: req.annixRepUser.userId, provider }),
    ).toString("base64");
    const url = this.crmService.oauthUrl(crmType, redirectUri, state);
    return { url };
  }

  @Post("oauth/:provider/callback")
  @ApiOperation({ summary: "Handle OAuth callback and exchange code for tokens" })
  @ApiParam({ name: "provider", enum: ["salesforce", "hubspot", "pipedrive"] })
  @ApiResponse({ status: 201, type: CrmConfigResponseDto })
  async oauthCallback(
    @Param("provider") provider: string,
    @Query("code") code: string,
    @Query("redirectUri") redirectUri: string,
    @Req() req: AnnixRepRequest,
  ): Promise<CrmConfigResponseDto> {
    if (!code) {
      throw new BadRequestException("Authorization code is required");
    }
    const crmType = this.parseCrmProvider(provider);
    const config = await this.crmService.handleOAuthCallback(
      req.annixRepUser.userId,
      crmType,
      code,
      redirectUri,
    );
    return this.toConfigResponse(config);
  }

  @Post("configs/:id/disconnect")
  @ApiOperation({ summary: "Disconnect OAuth integration and revoke tokens" })
  @ApiResponse({ status: 200 })
  async disconnect(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    await this.crmService.disconnectOAuth(req.annixRepUser.userId, id);
    return { success: true };
  }

  @Post("configs/:id/sync-now")
  @ApiOperation({ summary: "Trigger immediate sync for a CRM config" })
  @ApiResponse({ status: 200, type: CrmSyncLogResponseDto })
  async syncNow(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<CrmSyncLogResponseDto> {
    await this.crmService.configById(req.annixRepUser.userId, id);
    const syncLog = await this.crmSyncService.syncIncrementally(id);
    return this.toSyncLogResponse(syncLog);
  }

  @Post("configs/:id/pull-all")
  @ApiOperation({ summary: "Pull all contacts from CRM (full sync)" })
  @ApiResponse({ status: 200, type: CrmSyncLogResponseDto })
  async pullAll(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<CrmSyncLogResponseDto> {
    await this.crmService.configById(req.annixRepUser.userId, id);
    const syncLog = await this.crmSyncService.pullAllContacts(id);
    return this.toSyncLogResponse(syncLog);
  }

  @Get("configs/:id/sync-logs")
  @ApiOperation({ summary: "Get sync history for a CRM config" })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200 })
  async syncLogs(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): Promise<{ logs: CrmSyncLogResponseDto[]; total: number }> {
    await this.crmService.configById(req.annixRepUser.userId, id);
    const result = await this.crmSyncService.syncLogs(
      id,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
    return {
      logs: result.logs.map((log) => this.toSyncLogResponse(log)),
      total: result.total,
    };
  }

  @Post("configs/:id/refresh-token")
  @ApiOperation({ summary: "Manually refresh OAuth token" })
  @ApiResponse({ status: 200 })
  async refreshToken(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    await this.crmService.configById(req.annixRepUser.userId, id);
    await this.crmSyncService.refreshTokenIfNeeded(id);
    return { success: true };
  }

  private parseCrmProvider(provider: string): CrmType {
    const providerMap: Record<string, CrmType> = {
      salesforce: CrmType.SALESFORCE,
      hubspot: CrmType.HUBSPOT,
      pipedrive: CrmType.PIPEDRIVE,
    };
    const crmType = providerMap[provider.toLowerCase()];
    if (!crmType) {
      throw new BadRequestException(`Unknown CRM provider: ${provider}`);
    }
    return crmType;
  }

  private toSyncLogResponse(log: {
    id: number;
    configId: number;
    direction: string;
    status: string;
    recordsProcessed: number;
    recordsSucceeded: number;
    recordsFailed: number;
    errorDetails: Array<{
      recordId: string | number;
      recordType: string;
      error: string;
      timestamp: string;
    }> | null;
    startedAt: Date;
    completedAt: Date | null;
  }): CrmSyncLogResponseDto {
    return {
      id: log.id,
      configId: log.configId,
      direction: log.direction as "push" | "pull",
      status: log.status as "in_progress" | "completed" | "failed" | "partial",
      recordsProcessed: log.recordsProcessed,
      recordsSucceeded: log.recordsSucceeded,
      recordsFailed: log.recordsFailed,
      errorDetails: log.errorDetails,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
    };
  }

  private toConfigResponse(config: {
    id: number;
    userId: number;
    name: string;
    crmType: string;
    isActive: boolean;
    apiKeyEncrypted?: string | null;
    webhookConfig: {
      url: string;
      method: string;
      headers: Record<string, string>;
      authValue?: string | null;
    } | null;
    instanceUrl: string | null;
    crmUserId?: string | null;
    crmOrganizationId?: string | null;
    tokenExpiresAt?: Date | null;
    prospectFieldMappings: Array<{
      sourceField: string;
      targetField: string;
      transform: string | null;
    }> | null;
    meetingFieldMappings: Array<{
      sourceField: string;
      targetField: string;
      transform: string | null;
    }> | null;
    syncProspects: boolean;
    syncMeetings: boolean;
    syncOnCreate: boolean;
    syncOnUpdate: boolean;
    lastSyncAt: Date | null;
    lastSyncError: string | null;
    createdAt: Date;
  }): CrmConfigResponseDto {
    return {
      id: config.id,
      userId: config.userId,
      name: config.name,
      crmType: config.crmType as CrmConfigResponseDto["crmType"],
      isActive: config.isActive,
      isConnected: Boolean(config.apiKeyEncrypted),
      webhookConfig: config.webhookConfig
        ? {
            url: config.webhookConfig.url,
            method: config.webhookConfig.method as "POST" | "PUT" | "PATCH",
            headers: config.webhookConfig.headers,
            authType: "none" as const,
          }
        : null,
      instanceUrl: config.instanceUrl,
      crmUserId: config.crmUserId ?? null,
      crmOrganizationId: config.crmOrganizationId ?? null,
      tokenExpiresAt: config.tokenExpiresAt ?? null,
      prospectFieldMappings: config.prospectFieldMappings,
      meetingFieldMappings: config.meetingFieldMappings,
      syncProspects: config.syncProspects,
      syncMeetings: config.syncMeetings,
      syncOnCreate: config.syncOnCreate,
      syncOnUpdate: config.syncOnUpdate,
      lastSyncAt: config.lastSyncAt,
      lastSyncError: config.lastSyncError,
      createdAt: config.createdAt,
    };
  }
}
