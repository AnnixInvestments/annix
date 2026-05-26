import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";

export abstract class CustomerPurchaseOrderItemRepository extends CrudRepository<CustomerPurchaseOrderItem> {
  abstract withTransaction(context: TransactionContext): CrudRepository<CustomerPurchaseOrderItem>;
  abstract createMany(
    rows: Array<DeepPartial<CustomerPurchaseOrderItem>>,
  ): Promise<CustomerPurchaseOrderItem[]>;
  abstract findOneForCpoAndCompany(
    id: number,
    cpoId: number,
    companyId: number,
  ): Promise<CustomerPurchaseOrderItem | null>;
  abstract findOneForCpo(id: number, cpoId: number): Promise<CustomerPurchaseOrderItem | null>;
  abstract findForCpoOrdered(
    cpoId: number,
    companyId: number,
  ): Promise<CustomerPurchaseOrderItem[]>;
  abstract updateById(id: number, changes: DeepPartial<CustomerPurchaseOrderItem>): Promise<void>;
  abstract deleteForCpo(cpoId: number): Promise<void>;
}
