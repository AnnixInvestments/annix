import { CrmConfig } from "./crm-config.entity";

export enum SyncDirection {
  PUSH = "push",
  PULL = "pull",
}

export enum SyncStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  PARTIAL = "partial",
}

export interface SyncErrorDetail {
  recordId: string | number;
  recordType: "prospect" | "meeting";
  error: string;
  timestamp: string;
}

export class CrmSyncLog {
  id: number;

  config: CrmConfig;

  configId: number;

  direction: SyncDirection;

  status: SyncStatus;

  recordsProcessed: number;

  recordsSucceeded: number;

  recordsFailed: number;

  errorDetails: SyncErrorDetail[] | null;

  syncToken: string | null;

  startedAt: Date;

  completedAt: Date | null;
}
