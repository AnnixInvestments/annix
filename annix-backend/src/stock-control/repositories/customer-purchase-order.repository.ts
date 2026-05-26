import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { CpoStatus, CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";

export interface CpoSearchRow {
  id: number;
  cpoNumber: string;
  jobNumber: string;
  jobName: string | null;
  customerName: string | null;
  poNumber: string | null;
  status: string;
  updatedAt: Date;
}

export abstract class CustomerPurchaseOrderRepository extends CrudRepository<CustomerPurchaseOrder> {
  abstract withTransaction(context: TransactionContext): CrudRepository<CustomerPurchaseOrder>;
  abstract findPaginatedWithItems(
    companyId: number,
    status: string | null,
    page: number,
    limit: number,
  ): Promise<CustomerPurchaseOrder[]>;
  abstract findOneForCompanyWithItems(
    id: number,
    companyId: number,
  ): Promise<CustomerPurchaseOrder | null>;
  abstract findOneByIdWithItems(id: number): Promise<CustomerPurchaseOrder | null>;
  abstract findOneByNumberWithItems(
    cpoNumber: string,
    companyId: number,
  ): Promise<CustomerPurchaseOrder | null>;
  abstract findOneForCompany(id: number, companyId: number): Promise<CustomerPurchaseOrder | null>;
  abstract findActiveByJobNumberWithItems(
    companyId: number,
    jobNumber: string,
  ): Promise<CustomerPurchaseOrder[]>;
  abstract findAllForCompanyWithItems(companyId: number): Promise<CustomerPurchaseOrder[]>;
  abstract updateById(id: number, changes: DeepPartial<CustomerPurchaseOrder>): Promise<void>;
  abstract countByStatus(companyId: number, status: CpoStatus): Promise<number>;
  abstract searchForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<CpoSearchRow[]>;
}
