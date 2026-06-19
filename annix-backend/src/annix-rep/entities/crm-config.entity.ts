import { User } from "../../user/entities/user.entity";

export enum CrmType {
  WEBHOOK = "webhook",
  CSV_EXPORT = "csv_export",
  SALESFORCE = "salesforce",
  HUBSPOT = "hubspot",
  PIPEDRIVE = "pipedrive",
  CUSTOM = "custom",
}

export interface WebhookConfig {
  url: string;
  method: "POST" | "PUT" | "PATCH";
  headers: Record<string, string>;
  authType: "none" | "basic" | "bearer" | "api_key";
  authValue: string | null;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform: string | null;
}

export enum ConflictResolutionStrategy {
  LOCAL_WINS = "local_wins",
  REMOTE_WINS = "remote_wins",
  NEWEST_WINS = "newest_wins",
  MANUAL = "manual",
}

export class CrmConfig {
  id: number;

  user: User;

  userId: number;

  name: string;

  crmType: CrmType;

  isActive: boolean;

  webhookConfig: WebhookConfig | null;

  apiKeyEncrypted: string | null;

  apiSecretEncrypted: string | null;

  instanceUrl: string | null;

  refreshTokenEncrypted: string | null;

  tokenExpiresAt: Date | null;

  crmUserId: string | null;

  crmOrganizationId: string | null;

  prospectFieldMappings: FieldMapping[] | null;

  meetingFieldMappings: FieldMapping[] | null;

  syncProspects: boolean;

  syncMeetings: boolean;

  syncOnCreate: boolean;

  syncOnUpdate: boolean;

  conflictResolution: ConflictResolutionStrategy;

  lastPullSyncToken: string | null;

  lastSyncAt: Date | null;

  lastSyncError: string | null;

  createdAt: Date;

  updatedAt: Date;
}
