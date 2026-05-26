import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { QcControlPlan } from "../entities/qc-control-plan.entity";

export abstract class QcControlPlanRepository extends CrudRepository<QcControlPlan> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<QcControlPlan[]>;
  abstract findForCpo(companyId: number, cpoId: number): Promise<QcControlPlan[]>;
  abstract findCpoLevelForCpo(companyId: number, cpoId: number): Promise<QcControlPlan[]>;
  abstract findByIdForCompany(companyId: number, id: number): Promise<QcControlPlan | null>;
  abstract search(companyId: number, search: string | null): Promise<QcControlPlan[]>;
  abstract latestQcpNumberWithPrefix(companyId: number, prefix: string): Promise<string | null>;
  abstract updateById(id: number, updates: Partial<QcControlPlan>): Promise<void>;
  abstract findForJobCardUnordered(companyId: number, jobCardId: number): Promise<QcControlPlan[]>;
  abstract findForJobCardOrderedByCreatedAsc(
    companyId: number,
    jobCardId: number,
  ): Promise<QcControlPlan[]>;
}
