import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { SupplierInvoiceItem } from "../entities/supplier-invoice-item.entity";

export abstract class SupplierInvoiceItemRepository extends CrudRepository<SupplierInvoiceItem> {
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
