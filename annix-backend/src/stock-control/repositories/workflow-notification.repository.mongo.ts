import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import {
  NotificationActionType,
  WorkflowNotification,
} from "../entities/workflow-notification.entity";
import { WorkflowNotificationRepository } from "./workflow-notification.repository";

@Injectable()
export class MongoWorkflowNotificationRepository
  extends MongoTenantScopedRepository<WorkflowNotification>
  implements WorkflowNotificationRepository
{
  constructor(
    @InjectModel("WorkflowNotification") model: Model<WorkflowNotification>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoWorkflowNotificationRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoWorkflowNotificationRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoWorkflowNotificationRepository {
    return new MongoWorkflowNotificationRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: WorkflowNotification,
  ): Promise<WorkflowNotification> {
    if (entity.companyId !== companyId) {
      throw new Error("Notification does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: WorkflowNotification): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Notification does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  buildMany(rows: DeepPartial<WorkflowNotification>[]): WorkflowNotification[] {
    return rows as WorkflowNotification[];
  }

  async saveMany(entities: WorkflowNotification[]): Promise<WorkflowNotification[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async findUnreadForUser(userId: number): Promise<WorkflowNotification[]> {
    const docs = await this.documents
      .find({ userId, readAt: null })
      .populate(["jobCard"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllForUser(userId: number, limit: number): Promise<WorkflowNotification[]> {
    const docs = await this.documents
      .find({ userId })
      .populate(["jobCard"])
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countUnreadForUser(userId: number): Promise<number> {
    return this.documents.countDocuments({ userId, readAt: null }).exec();
  }

  async markReadByIdForUser(notificationId: number, userId: number, readAt: Date): Promise<void> {
    await this.documents.updateOne({ _id: notificationId, userId }, { $set: { readAt } }).exec();
  }

  async markAllReadForUser(userId: number, readAt: Date): Promise<void> {
    await this.documents.updateMany({ userId, readAt: null }, { $set: { readAt } }).exec();
  }

  async markReadForUserAndJobCard(userId: number, jobCardId: number, readAt: Date): Promise<void> {
    await this.documents
      .updateMany({ userId, jobCardId, readAt: null }, { $set: { readAt } })
      .exec();
  }

  async findUnreadByActionTypeForUser(
    userId: number,
    companyId: number,
    actionType: NotificationActionType,
  ): Promise<WorkflowNotification[]> {
    const docs = await this.documents
      .find({ userId, companyId, actionType, readAt: null })
      .populate(["jobCard"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteForUser(companyId: number, userId: number): Promise<void> {
    await this.documents.deleteMany({ companyId, userId }).exec();
  }
}
