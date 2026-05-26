import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import {
  NotificationActionType,
  WorkflowNotification,
} from "../entities/workflow-notification.entity";
import { WorkflowNotificationRepository } from "./workflow-notification.repository";

@Injectable()
export class PostgresWorkflowNotificationRepository
  extends TypeOrmCrudRepository<WorkflowNotification>
  implements WorkflowNotificationRepository
{
  constructor(
    @InjectRepository(WorkflowNotification) repository: Repository<WorkflowNotification>,
  ) {
    super(repository);
  }

  buildMany(rows: DeepPartial<WorkflowNotification>[]): WorkflowNotification[] {
    return this.repository.create(rows as TypeOrmDeepPartial<WorkflowNotification>[]);
  }

  saveMany(entities: WorkflowNotification[]): Promise<WorkflowNotification[]> {
    return this.repository.save(entities);
  }

  findUnreadForUser(userId: number): Promise<WorkflowNotification[]> {
    return this.repository.find({
      where: { userId, readAt: IsNull() },
      relations: ["jobCard"],
      order: { createdAt: "DESC" },
    });
  }

  findAllForUser(userId: number, limit: number): Promise<WorkflowNotification[]> {
    return this.repository.find({
      where: { userId },
      relations: ["jobCard"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  countUnreadForUser(userId: number): Promise<number> {
    return this.repository.count({ where: { userId, readAt: IsNull() } });
  }

  async markReadByIdForUser(notificationId: number, userId: number, readAt: Date): Promise<void> {
    await this.repository.update({ id: notificationId, userId }, { readAt });
  }

  async markAllReadForUser(userId: number, readAt: Date): Promise<void> {
    await this.repository.update({ userId, readAt: IsNull() }, { readAt });
  }

  async markReadForUserAndJobCard(userId: number, jobCardId: number, readAt: Date): Promise<void> {
    await this.repository.update({ userId, jobCardId, readAt: IsNull() }, { readAt });
  }

  findUnreadByActionTypeForUser(
    userId: number,
    companyId: number,
    actionType: NotificationActionType,
  ): Promise<WorkflowNotification[]> {
    return this.repository.find({
      where: {
        userId,
        companyId,
        actionType,
        readAt: IsNull(),
      },
      relations: ["jobCard"],
      order: { createdAt: "DESC" },
    });
  }
}
