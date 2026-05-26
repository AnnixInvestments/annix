import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { WorkflowNotificationRecipient } from "../entities/workflow-notification-recipient.entity";
import { WorkflowNotificationRecipientRepository } from "./workflow-notification-recipient.repository";

@Injectable()
export class MongoWorkflowNotificationRecipientRepository
  extends MongoCrudRepository<WorkflowNotificationRecipient>
  implements WorkflowNotificationRecipientRepository
{
  constructor(
    @InjectModel("WorkflowNotificationRecipient")
    model: Model<WorkflowNotificationRecipient>,
  ) {
    super(model);
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
