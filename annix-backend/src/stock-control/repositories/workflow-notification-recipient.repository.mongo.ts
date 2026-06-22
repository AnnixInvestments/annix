import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { WorkflowNotificationRecipient } from "../entities/workflow-notification-recipient.entity";
import { WorkflowNotificationRecipientRepository } from "./workflow-notification-recipient.repository";

@Injectable()
export class MongoWorkflowNotificationRecipientRepository
  extends MongoTenantScopedRepository<WorkflowNotificationRecipient>
  implements WorkflowNotificationRecipientRepository
{
  constructor(
    @InjectModel("WorkflowNotificationRecipient")
    model: Model<WorkflowNotificationRecipient>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoWorkflowNotificationRecipientRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error(
        "MongoWorkflowNotificationRecipientRepository requires a MongoTransactionContext",
      );
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoWorkflowNotificationRecipientRepository {
    return new MongoWorkflowNotificationRecipientRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: WorkflowNotificationRecipient,
  ): Promise<WorkflowNotificationRecipient> {
    if (entity.companyId !== companyId) {
      throw new Error("Notification recipient does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: WorkflowNotificationRecipient): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Notification recipient does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  buildMany(rows: DeepPartial<WorkflowNotificationRecipient>[]): WorkflowNotificationRecipient[] {
    return rows as WorkflowNotificationRecipient[];
  }

  async saveMany(
    entities: WorkflowNotificationRecipient[],
  ): Promise<WorkflowNotificationRecipient[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async findForCompanyOrdered(companyId: number): Promise<WorkflowNotificationRecipient[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ workflowStep: 1, email: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForStepOrdered(
    companyId: number,
    step: string,
  ): Promise<WorkflowNotificationRecipient[]> {
    const docs = await this.documents
      .find({ companyId, workflowStep: step })
      .sort({ email: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteForStep(companyId: number, step: string): Promise<void> {
    await this.documents.deleteMany({ companyId, workflowStep: step }).exec();
  }
}
