import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { WorkflowNotificationRecipient } from "../entities/workflow-notification-recipient.entity";

export abstract class WorkflowNotificationRecipientRepository extends CrudRepository<WorkflowNotificationRecipient> {
  abstract buildMany(
    rows: DeepPartial<WorkflowNotificationRecipient>[],
  ): WorkflowNotificationRecipient[];
  abstract saveMany(
    entities: WorkflowNotificationRecipient[],
  ): Promise<WorkflowNotificationRecipient[]>;
  abstract findForCompanyOrdered(companyId: number): Promise<WorkflowNotificationRecipient[]>;
  abstract findForStepOrdered(
    companyId: number,
    step: string,
  ): Promise<WorkflowNotificationRecipient[]>;
  abstract deleteForStep(companyId: number, step: string): Promise<void>;
}
