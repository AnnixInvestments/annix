import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { Requisition, RequisitionSource } from "../entities/requisition.entity";

export abstract class RequisitionRepository extends TenantScopedRepository<Requisition> {
  abstract withTransaction(context: TransactionContext): RequisitionRepository;
  abstract saveForCompany(companyId: number, entity: Requisition): Promise<Requisition>;
  abstract removeForCompany(companyId: number, entity: Requisition): Promise<void>;
  abstract findActiveForJobCard(companyId: number, jobCardId: number): Promise<Requisition | null>;
  abstract findActiveForJobCardWithItems(
    companyId: number,
    jobCardId: number,
  ): Promise<Requisition | null>;
  abstract findAllForCompanyPaginated(
    companyId: number,
    page: number,
    limit: number,
  ): Promise<Requisition[]>;
  abstract findOneForCompanyWithDetails(id: number, companyId: number): Promise<Requisition | null>;
  abstract findOneForCompanyWithItems(id: number, companyId: number): Promise<Requisition | null>;
  abstract findByExactNumber(
    companyId: number,
    requisitionNumber: string,
  ): Promise<Requisition | null>;
  abstract countByNumberPrefix(companyId: number, prefix: string): Promise<number>;
  abstract findActiveReorderByNumber(
    companyId: number,
    requisitionNumber: string,
    source: RequisitionSource,
  ): Promise<Requisition | null>;
  abstract findForCpo(cpoId: number, companyId: number): Promise<Requisition | null>;
  abstract findCalloffForCpo(cpoId: number, companyId: number): Promise<Requisition | null>;
}
