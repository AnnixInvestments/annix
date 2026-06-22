import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { SupplierInvoiceItem } from "../entities/supplier-invoice-item.entity";

export abstract class SupplierInvoiceItemRepository extends TenantScopedRepository<SupplierInvoiceItem> {
  abstract withTransaction(context: TransactionContext): SupplierInvoiceItemRepository;
  abstract saveForCompany(
    companyId: number,
    entity: SupplierInvoiceItem,
  ): Promise<SupplierInvoiceItem>;
  abstract removeForCompany(companyId: number, entity: SupplierInvoiceItem): Promise<void>;
  abstract buildMany(rows: DeepPartial<SupplierInvoiceItem>[]): SupplierInvoiceItem[];
  abstract saveMany(entities: SupplierInvoiceItem[]): Promise<SupplierInvoiceItem[]>;
  abstract countByInvoice(invoiceId: number): Promise<number>;
  abstract deleteByInvoice(invoiceId: number): Promise<void>;
  abstract findByInvoice(invoiceId: number): Promise<SupplierInvoiceItem[]>;
  abstract findByInvoiceWithRelations(
    invoiceId: number,
    relations: string[],
  ): Promise<SupplierInvoiceItem[]>;
  abstract findOneByIdAndInvoice(
    id: number,
    invoiceId: number,
  ): Promise<SupplierInvoiceItem | null>;
  abstract findOneByIdAndInvoiceWithRelations(
    id: number,
    invoiceId: number,
    relations: string[],
  ): Promise<SupplierInvoiceItem | null>;
}
