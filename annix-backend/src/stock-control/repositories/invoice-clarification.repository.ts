import { CrudRepository } from "../../lib/persistence/crud-repository";
import {
  ClarificationStatus,
  InvoiceClarification,
} from "../entities/invoice-clarification.entity";

export abstract class InvoiceClarificationRepository extends CrudRepository<InvoiceClarification> {
  abstract countByInvoiceAndStatus(
    invoiceId: number,
    status: ClarificationStatus | string,
  ): Promise<number>;
  abstract deleteForInvoice(invoiceId: number): Promise<void>;
  abstract findOneByIdWithRelations(clarificationId: number): Promise<InvoiceClarification | null>;
  abstract findByInvoiceItemAndStatus(
    invoiceItemId: number,
    status: ClarificationStatus,
  ): Promise<InvoiceClarification[]>;
  abstract findByInvoiceAndStatus(
    invoiceId: number,
    status: ClarificationStatus,
  ): Promise<InvoiceClarification[]>;
  abstract findSkippedPriceForInvoice(invoiceId: number): Promise<InvoiceClarification[]>;
  abstract findPendingForInvoiceWithItem(invoiceId: number): Promise<InvoiceClarification[]>;
  abstract saveMany(entities: InvoiceClarification[]): Promise<InvoiceClarification[]>;
}
