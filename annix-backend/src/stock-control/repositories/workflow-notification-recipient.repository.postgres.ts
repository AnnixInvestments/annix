import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { WorkflowNotificationRecipient } from "../entities/workflow-notification-recipient.entity";
import { WorkflowNotificationRecipientRepository } from "./workflow-notification-recipient.repository";

@Injectable()
export class PostgresWorkflowNotificationRecipientRepository
  extends TypeOrmCrudRepository<WorkflowNotificationRecipient>
  implements WorkflowNotificationRecipientRepository
{
  constructor(
    @InjectRepository(WorkflowNotificationRecipient)
    repository: Repository<WorkflowNotificationRecipient>,
  ) {
    super(repository);
  }

  buildMany(rows: DeepPartial<WorkflowNotificationRecipient>[]): WorkflowNotificationRecipient[] {
    return this.repository.create(rows as TypeOrmDeepPartial<WorkflowNotificationRecipient>[]);
  }

  saveMany(entities: WorkflowNotificationRecipient[]): Promise<WorkflowNotificationRecipient[]> {
    return this.repository.save(entities);
  }

  findForCompanyOrdered(companyId: number): Promise<WorkflowNotificationRecipient[]> {
    return this.repository.find({
      where: { companyId },
      order: { workflowStep: "ASC", email: "ASC" },
    });
  }

  findForStepOrdered(companyId: number, step: string): Promise<WorkflowNotificationRecipient[]> {
    return this.repository.find({
      where: { companyId, workflowStep: step },
      order: { email: "ASC" },
    });
  }

  async deleteForStep(companyId: number, step: string): Promise<void> {
    await this.repository.delete({ companyId, workflowStep: step });
  }
}
