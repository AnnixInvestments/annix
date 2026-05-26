import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import {
  NotificationActionType,
  WorkflowNotification,
} from "../entities/workflow-notification.entity";

export abstract class WorkflowNotificationRepository extends CrudRepository<WorkflowNotification> {
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
}
