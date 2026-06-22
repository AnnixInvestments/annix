import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import {
  NotificationActionType,
  WorkflowNotification,
} from "../entities/workflow-notification.entity";

export abstract class WorkflowNotificationRepository extends TenantScopedRepository<WorkflowNotification> {
  abstract withTransaction(context: TransactionContext): WorkflowNotificationRepository;
  abstract saveForCompany(
    companyId: number,
    entity: WorkflowNotification,
  ): Promise<WorkflowNotification>;
  abstract removeForCompany(companyId: number, entity: WorkflowNotification): Promise<void>;
  abstract buildMany(rows: DeepPartial<WorkflowNotification>[]): WorkflowNotification[];
  abstract saveMany(entities: WorkflowNotification[]): Promise<WorkflowNotification[]>;
  abstract findUnreadForUser(userId: number): Promise<WorkflowNotification[]>;
  abstract findAllForUser(userId: number, limit: number): Promise<WorkflowNotification[]>;
  abstract countUnreadForUser(userId: number): Promise<number>;
  abstract markReadByIdForUser(notificationId: number, userId: number, readAt: Date): Promise<void>;
  abstract markAllReadForUser(userId: number, readAt: Date): Promise<void>;
  abstract markReadForUserAndJobCard(
    userId: number,
    jobCardId: number,
    readAt: Date,
  ): Promise<void>;
  abstract findUnreadByActionTypeForUser(
    userId: number,
    companyId: number,
    actionType: NotificationActionType,
  ): Promise<WorkflowNotification[]>;
  abstract deleteForUser(companyId: number, userId: number): Promise<void>;
}
