import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { WorkflowNotificationRecipient } from "../entities/workflow-notification-recipient.entity";

export abstract class WorkflowNotificationRecipientRepository extends TenantScopedRepository<WorkflowNotificationRecipient> {
  abstract withTransaction(context: TransactionContext): WorkflowNotificationRecipientRepository;
  abstract saveForCompany(
    companyId: number,
    entity: WorkflowNotificationRecipient,
  ): Promise<WorkflowNotificationRecipient>;
  abstract removeForCompany(
    companyId: number,
    entity: WorkflowNotificationRecipient,
  ): Promise<void>;
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
