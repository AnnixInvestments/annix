import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { WorkflowStepConfig } from "../entities/workflow-step-config.entity";

export abstract class WorkflowStepConfigRepository extends CrudRepository<WorkflowStepConfig> {
  abstract build(data: DeepPartial<WorkflowStepConfig>): WorkflowStepConfig;
  abstract findOrderedForeground(companyId: number): Promise<WorkflowStepConfig[]>;
  abstract findOrderedBackground(companyId: number): Promise<WorkflowStepConfig[]>;
  abstract findBackgroundForTrigger(
    companyId: number,
    triggerStepKey: string,
  ): Promise<WorkflowStepConfig[]>;
  abstract findForCompany(companyId: number): Promise<WorkflowStepConfig[]>;
  abstract findOneForCompanyByKey(
    companyId: number,
    key: string,
  ): Promise<WorkflowStepConfig | null>;
  abstract findOneForegroundForCompanyByKey(
    companyId: number,
    key: string,
  ): Promise<WorkflowStepConfig | null>;
  abstract insertManyIgnore(entities: DeepPartial<WorkflowStepConfig>[]): Promise<void>;
  abstract updateByCompanyAndKey(
    companyId: number,
    key: string,
    updates: DeepPartial<WorkflowStepConfig>,
  ): Promise<number>;
  abstract updateById(id: number, updates: DeepPartial<WorkflowStepConfig>): Promise<void>;
  abstract updateTriggerAfterStep(
    companyId: number,
    triggerAfterStep: string,
    newTriggerAfterStep: string | null,
  ): Promise<void>;
  abstract bumpSortOrderAfter(companyId: number, sortOrder: number): Promise<void>;
}
