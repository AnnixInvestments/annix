import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { CustomerDocument } from "./entities/customer-document.entity";

export abstract class CustomerDocumentRepository extends CrudRepository<CustomerDocument> {
  abstract withTransaction(context: TransactionContext): CrudRepository<CustomerDocument>;
  abstract findByCustomerIdOrdered(customerId: number): Promise<CustomerDocument[]>;
  abstract findByCustomerIdWithReviewer(customerId: number): Promise<CustomerDocument[]>;
  abstract findRequiredByCustomerId(customerId: number): Promise<CustomerDocument[]>;
  abstract findByIdWithRelations(id: number, relations: string[]): Promise<CustomerDocument | null>;
  abstract findOneForCustomerWithRelations(
    id: number,
    customerId: number,
    relations: string[],
  ): Promise<CustomerDocument | null>;
  abstract approvePendingForCustomer(
    customerId: number,
    reviewedById: number,
    reviewedAt: Date,
  ): Promise<void>;
  abstract markValidAsReviewed(customerId: number, reviewedAt: Date): Promise<void>;
  abstract findWithExpiryByCustomerId(customerId: number): Promise<CustomerDocument[]>;
  abstract findExpiringWithoutWarning(warningDate: Date): Promise<CustomerDocument[]>;
  abstract markWarningSent(documentIds: number[], sentAt: Date): Promise<void>;
  abstract markExpiredNotificationSent(documentIds: number[], sentAt: Date): Promise<void>;
  abstract updateExpiryAndResetFlags(documentId: number, newExpiryDate: Date): Promise<void>;
}
