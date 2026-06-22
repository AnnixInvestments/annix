import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import {
  ClarificationStatus,
  InvoiceClarification,
} from "../entities/invoice-clarification.entity";

export abstract class InvoiceClarificationRepository extends TenantScopedRepository<InvoiceClarification> {
  abstract withTransaction(context: TransactionContext): InvoiceClarificationRepository;
  abstract saveForCompany(
    companyId: number,
    entity: InvoiceClarification,
  ): Promise<InvoiceClarification>;
  abstract removeForCompany(companyId: number, entity: InvoiceClarification): Promise<void>;
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
