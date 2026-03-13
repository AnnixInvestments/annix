import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import type { FieldMapping, WebhookConfig } from "../entities";
import { CrmType } from "../entities";

export class CreateCrmConfigDto {
  @ApiProperty({ description: "Configuration name", example: "My Salesforce" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: "CRM type",
    enum: CrmType,
  })
  @IsEnum(CrmType)
  @IsNotEmpty()
  crmType: CrmType;

  @ApiPropertyOptional({ description: "Webhook configuration" })
  @IsObject()
  @IsOptional()
  webhookConfig?: WebhookConfig;

  @ApiPropertyOptional({ description: "API key (will be encrypted)" })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ description: "API secret (will be encrypted)" })
  @IsString()
  @IsOptional()
  apiSecret?: string;

  @ApiPropertyOptional({ description: "CRM instance URL" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  instanceUrl?: string;

  @ApiPropertyOptional({ description: "Field mappings for prospects" })
  @IsArray()
  @IsOptional()
  prospectFieldMappings?: FieldMapping[];

  @ApiPropertyOptional({ description: "Field mappings for meetings" })
  @IsArray()
  @IsOptional()
  meetingFieldMappings?: FieldMapping[];

  @ApiPropertyOptional({ description: "Sync prospects to CRM", default: true })
  @IsBoolean()
  @IsOptional()
  syncProspects?: boolean;

  @ApiPropertyOptional({ description: "Sync meetings to CRM", default: true })
  @IsBoolean()
  @IsOptional()
  syncMeetings?: boolean;

  @ApiPropertyOptional({ description: "Sync on create", default: true })
  @IsBoolean()
  @IsOptional()
  syncOnCreate?: boolean;

  @ApiPropertyOptional({ description: "Sync on update", default: true })
  @IsBoolean()
  @IsOptional()
  syncOnUpdate?: boolean;
}

export class UpdateCrmConfigDto extends PartialType(CreateCrmConfigDto) {
  @ApiPropertyOptional({ description: "Enable/disable this configuration" })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CrmConfigResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: CrmType })
  crmType: CrmType;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ description: "Whether OAuth is connected" })
  isConnected: boolean;

  @ApiPropertyOptional()
  webhookConfig: Omit<WebhookConfig, "authValue"> | null;

  @ApiPropertyOptional()
  instanceUrl: string | null;

  @ApiPropertyOptional({ description: "CRM user ID from OAuth" })
  crmUserId: string | null;

  @ApiPropertyOptional({ description: "CRM organization ID from OAuth" })
  crmOrganizationId: string | null;

  @ApiPropertyOptional({ description: "OAuth token expiration time" })
  tokenExpiresAt: Date | null;

  @ApiPropertyOptional()
  prospectFieldMappings: FieldMapping[] | null;

  @ApiPropertyOptional()
  meetingFieldMappings: FieldMapping[] | null;

  @ApiProperty()
  syncProspects: boolean;

  @ApiProperty()
  syncMeetings: boolean;

  @ApiProperty()
  syncOnCreate: boolean;

  @ApiProperty()
  syncOnUpdate: boolean;

  @ApiPropertyOptional()
  lastSyncAt: Date | null;

  @ApiPropertyOptional()
  lastSyncError: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class TestCrmConnectionDto {
  @ApiPropertyOptional({ description: "Test with sample data" })
  @IsBoolean()
  @IsOptional()
  sendTestData?: boolean;
}

export class SyncResultDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  message: string | null;

  @ApiPropertyOptional()
  externalId: string | null;

  @ApiPropertyOptional()
  error: string | null;
}

export class CrmSyncStatusDto {
  @ApiProperty()
  configId: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  lastSyncAt: Date | null;

  @ApiProperty()
  prospectsSynced: number;

  @ApiProperty()
  meetingsSynced: number;

  @ApiProperty()
  pendingSync: number;

  @ApiProperty()
  failedSync: number;
}

export class SyncErrorDetailDto {
  @ApiProperty()
  recordId: string | number;

  @ApiProperty()
  recordType: string;

  @ApiProperty()
  error: string;

  @ApiProperty()
  timestamp: string;
}

export class CrmSyncLogResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  configId: number;

  @ApiProperty({ enum: ["push", "pull"] })
  direction: "push" | "pull";

  @ApiProperty({ enum: ["in_progress", "completed", "failed", "partial"] })
  status: "in_progress" | "completed" | "failed" | "partial";

  @ApiProperty()
  recordsProcessed: number;

  @ApiProperty()
  recordsSucceeded: number;

  @ApiProperty()
  recordsFailed: number;

  @ApiPropertyOptional({ type: [SyncErrorDetailDto] })
  errorDetails: SyncErrorDetailDto[] | null;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  completedAt: Date | null;
}
