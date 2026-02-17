import {
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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { FieldFlowAuthGuard } from "../auth";
import {
  CreateCrmConfigDto,
  CrmConfigResponseDto,
  CrmSyncStatusDto,
  SyncResultDto,
  UpdateCrmConfigDto,
} from "../dto";
import { CrmService } from "../services/crm.service";

interface FieldFlowRequest extends Request {
  fieldflowUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("FieldFlow - CRM")
@Controller("fieldflow/crm")
@UseGuards(FieldFlowAuthGuard)
@ApiBearerAuth()
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get("configs")
  @ApiOperation({ summary: "List all CRM configurations" })
  @ApiResponse({ status: 200, type: [CrmConfigResponseDto] })
  async listConfigs(@Req() req: FieldFlowRequest): Promise<CrmConfigResponseDto[]> {
    const configs = await this.crmService.listConfigs(req.fieldflowUser.userId);
    return configs.map((config) => this.toConfigResponse(config));
  }

  @Get("configs/:id")
  @ApiOperation({ summary: "Get CRM configuration by ID" })
  @ApiResponse({ status: 200, type: CrmConfigResponseDto })
  async configById(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<CrmConfigResponseDto> {
    const config = await this.crmService.configById(req.fieldflowUser.userId, id);
    return this.toConfigResponse(config);
  }

  @Post("configs")
  @ApiOperation({ summary: "Create new CRM configuration" })
  @ApiResponse({ status: 201, type: CrmConfigResponseDto })
  async createConfig(
    @Req() req: FieldFlowRequest,
    @Body() dto: CreateCrmConfigDto,
  ): Promise<CrmConfigResponseDto> {
    const config = await this.crmService.createConfig(req.fieldflowUser.userId, dto);
    return this.toConfigResponse(config);
  }

  @Patch("configs/:id")
  @ApiOperation({ summary: "Update CRM configuration" })
  @ApiResponse({ status: 200, type: CrmConfigResponseDto })
  async updateConfig(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCrmConfigDto,
  ): Promise<CrmConfigResponseDto> {
    const config = await this.crmService.updateConfig(req.fieldflowUser.userId, id, dto);
    return this.toConfigResponse(config);
  }

  @Delete("configs/:id")
  @ApiOperation({ summary: "Delete CRM configuration" })
  @ApiResponse({ status: 204 })
  async deleteConfig(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<void> {
    await this.crmService.deleteConfig(req.fieldflowUser.userId, id);
  }

  @Post("configs/:id/test")
  @ApiOperation({ summary: "Test CRM connection" })
  @ApiResponse({ status: 200 })
  async testConnection(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ success: boolean; message: string }> {
    return this.crmService.testConnection(req.fieldflowUser.userId, id);
  }

  @Post("configs/:id/sync/prospect/:prospectId")
  @ApiOperation({ summary: "Sync a specific prospect to CRM" })
  @ApiResponse({ status: 200, type: SyncResultDto })
  async syncProspect(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
    @Param("prospectId", ParseIntPipe) prospectId: number,
  ): Promise<SyncResultDto> {
    const result = await this.crmService.syncProspect(req.fieldflowUser.userId, id, prospectId);
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
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
    @Param("meetingId", ParseIntPipe) meetingId: number,
  ): Promise<SyncResultDto> {
    const result = await this.crmService.syncMeeting(req.fieldflowUser.userId, id, meetingId);
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
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ synced: number; failed: number }> {
    return this.crmService.syncAllProspects(req.fieldflowUser.userId, id);
  }

  @Get("configs/:id/status")
  @ApiOperation({ summary: "Get CRM sync status" })
  @ApiResponse({ status: 200, type: CrmSyncStatusDto })
  async syncStatus(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<CrmSyncStatusDto> {
    return this.crmService.syncStatus(req.fieldflowUser.userId, id);
  }

  @Get("export/prospects")
  @ApiOperation({ summary: "Export prospects as CSV" })
  @ApiQuery({ name: "configId", required: false })
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", "attachment; filename=prospects.csv")
  async exportProspects(
    @Req() req: FieldFlowRequest,
    @Query("configId") configId?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const csv = await this.crmService.exportProspectsCsv(
      req.fieldflowUser.userId,
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
    @Req() req: FieldFlowRequest,
    @Query("configId") configId?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const csv = await this.crmService.exportMeetingsCsv(
      req.fieldflowUser.userId,
      configId ? parseInt(configId, 10) : null,
    );
    res?.send(csv);
  }

  private toConfigResponse(config: {
    id: number;
    userId: number;
    name: string;
    crmType: string;
    isActive: boolean;
    webhookConfig: {
      url: string;
      method: string;
      headers: Record<string, string>;
      authValue?: string | null;
    } | null;
    instanceUrl: string | null;
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
      webhookConfig: config.webhookConfig
        ? {
            url: config.webhookConfig.url,
            method: config.webhookConfig.method as "POST" | "PUT" | "PATCH",
            headers: config.webhookConfig.headers,
            authType: "none" as const,
          }
        : null,
      instanceUrl: config.instanceUrl,
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
