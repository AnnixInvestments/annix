import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { RequisitionItem } from "../entities/requisition-item.entity";

export abstract class RequisitionItemRepository extends TenantScopedRepository<RequisitionItem> {
  abstract withTransaction(context: TransactionContext): RequisitionItemRepository;
  abstract saveForCompany(companyId: number, entity: RequisitionItem): Promise<RequisitionItem>;
  abstract removeForCompany(companyId: number, entity: RequisitionItem): Promise<void>;
  abstract findOneForCompanyWithStockItem(
    id: number,
    companyId: number,
  ): Promise<RequisitionItem | null>;
  abstract findOneForRequisition(
    id: number,
    requisitionId: number,
    companyId: number,
  ): Promise<RequisitionItem | null>;
  abstract buildMany(rows: DeepPartial<RequisitionItem>[]): RequisitionItem[];
  abstract saveManyForCompany(
    companyId: number,
    entities: RequisitionItem[],
  ): Promise<RequisitionItem[]>;
}
