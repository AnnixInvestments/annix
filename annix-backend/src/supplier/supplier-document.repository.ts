import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { SupplierDocument, SupplierDocumentType } from "./entities/supplier-document.entity";

export abstract class SupplierDocumentRepository extends CrudRepository<SupplierDocument> {
  abstract withTransaction(context: TransactionContext): CrudRepository<SupplierDocument>;
  abstract findBySupplierIdAndType(
    supplierId: number,
    documentType: SupplierDocumentType,
  ): Promise<SupplierDocument | null>;
  abstract findByIdAndSupplierId(id: number, supplierId: number): Promise<SupplierDocument | null>;
  abstract findByIdAndSupplierIdWithRelations(
    id: number,
    supplierId: number,
    relations: string[],
  ): Promise<SupplierDocument | null>;
  abstract findBySupplierIdOrdered(supplierId: number): Promise<SupplierDocument[]>;
  abstract findBySupplierId(supplierId: number): Promise<SupplierDocument[]>;
  abstract markValidAsReviewed(supplierId: number, reviewedAt: Date): Promise<void>;
  abstract findWithExpiryBySupplierId(supplierId: number): Promise<SupplierDocument[]>;
  abstract findExpiringWithoutWarning(warningDate: Date): Promise<SupplierDocument[]>;
  abstract markWarningSent(documentIds: number[], sentAt: Date): Promise<void>;
  abstract markExpiredNotificationSent(documentIds: number[], sentAt: Date): Promise<void>;
  abstract updateExpiryAndResetFlags(documentId: number, newExpiryDate: Date): Promise<void>;
}
