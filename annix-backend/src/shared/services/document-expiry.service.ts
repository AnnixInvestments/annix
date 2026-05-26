import { Injectable, Logger } from "@nestjs/common";
import { CustomerDocumentRepository } from "../../customer/customer-document.repository";
import { fromJSDate, now } from "../../lib/datetime";
import { SupplierDocumentRepository } from "../../supplier/supplier-document.repository";

export interface ExpiringDocument {
  id: number;
  documentType: string;
  fileName: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  ownerType: "customer" | "supplier";
  ownerId: number;
  ownerEmail?: string;
}

export interface ExpiryCheckResult {
  expiringSoon: ExpiringDocument[];
  expired: ExpiringDocument[];
}

@Injectable()
export class DocumentExpiryService {
  private readonly logger = new Logger(DocumentExpiryService.name);
  private readonly warningDays = 30;

  constructor(
    private readonly customerDocumentRepo: CustomerDocumentRepository,
    private readonly supplierDocumentRepo: SupplierDocumentRepository,
  ) {}

  async checkCustomerDocumentExpiry(customerId: number): Promise<ExpiryCheckResult> {
    const today = now().startOf("day");

    const documents = await this.customerDocumentRepo.findWithExpiryByCustomerId(customerId);

    const expiringSoon: ExpiringDocument[] = [];
    const expired: ExpiringDocument[] = [];

    for (const doc of documents) {
      if (!doc.expiryDate) continue;

      const expiryDateTime = fromJSDate(doc.expiryDate);
      const daysUntilExpiry = Math.ceil(expiryDateTime.diff(today, "days").days);

      const expiringDoc: ExpiringDocument = {
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        expiryDate: doc.expiryDate,
        daysUntilExpiry,
        ownerType: "customer",
        ownerId: customerId,
      };

      if (daysUntilExpiry <= 0) {
        expired.push(expiringDoc);
      } else if (daysUntilExpiry <= this.warningDays) {
        expiringSoon.push(expiringDoc);
      }
    }

    return { expiringSoon, expired };
  }

  async checkSupplierDocumentExpiry(supplierId: number): Promise<ExpiryCheckResult> {
    const today = now().startOf("day");

    const documents = await this.supplierDocumentRepo.findWithExpiryBySupplierId(supplierId);

    const expiringSoon: ExpiringDocument[] = [];
    const expired: ExpiringDocument[] = [];

    for (const doc of documents) {
      if (!doc.expiryDate) continue;

      const expiryDateTime = fromJSDate(doc.expiryDate);
      const daysUntilExpiry = Math.ceil(expiryDateTime.diff(today, "days").days);

      const expiringDoc: ExpiringDocument = {
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        expiryDate: doc.expiryDate,
        daysUntilExpiry,
        ownerType: "supplier",
        ownerId: supplierId,
      };

      if (daysUntilExpiry <= 0) {
        expired.push(expiringDoc);
      } else if (daysUntilExpiry <= this.warningDays) {
        expiringSoon.push(expiringDoc);
      }
    }

    return { expiringSoon, expired };
  }

  async markWarningsSent(documentIds: number[], ownerType: "customer" | "supplier"): Promise<void> {
    const sentAt = now().toJSDate();
    if (ownerType === "customer") {
      await this.customerDocumentRepo.markWarningSent(documentIds, sentAt);
    } else {
      await this.supplierDocumentRepo.markWarningSent(documentIds, sentAt);
    }
  }

  async markExpiredNotificationSent(
    documentIds: number[],
    ownerType: "customer" | "supplier",
  ): Promise<void> {
    const sentAt = now().toJSDate();
    if (ownerType === "customer") {
      await this.customerDocumentRepo.markExpiredNotificationSent(documentIds, sentAt);
    } else {
      await this.supplierDocumentRepo.markExpiredNotificationSent(documentIds, sentAt);
    }
  }

  async updateDocumentExpiry(
    documentId: number,
    ownerType: "customer" | "supplier",
    newExpiryDate: Date,
  ): Promise<void> {
    if (ownerType === "customer") {
      await this.customerDocumentRepo.updateExpiryAndResetFlags(documentId, newExpiryDate);
    } else {
      await this.supplierDocumentRepo.updateExpiryAndResetFlags(documentId, newExpiryDate);
    }
    this.logger.log(`Document ${documentId} expiry updated to ${newExpiryDate.toISOString()}`);
  }

  async getAllExpiringDocuments(): Promise<{
    customers: Array<{ customerId: number; result: ExpiryCheckResult }>;
    suppliers: Array<{ supplierId: number; result: ExpiryCheckResult }>;
  }> {
    const warningDate = now().plus({ days: this.warningDays }).toJSDate();

    const customerDocs = await this.customerDocumentRepo.findExpiringWithoutWarning(warningDate);
    const supplierDocs = await this.supplierDocumentRepo.findExpiringWithoutWarning(warningDate);

    const customerMap = new Map<number, ExpiryCheckResult>();
    for (const doc of customerDocs) {
      const expiryDateTime = fromJSDate(doc.expiryDate!);
      const daysUntilExpiry = Math.ceil(expiryDateTime.diff(now().startOf("day"), "days").days);

      const expiringDoc: ExpiringDocument = {
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        expiryDate: doc.expiryDate!,
        daysUntilExpiry,
        ownerType: "customer",
        ownerId: doc.customerId,
      };

      if (!customerMap.has(doc.customerId)) {
        customerMap.set(doc.customerId, { expiringSoon: [], expired: [] });
      }

      const result = customerMap.get(doc.customerId)!;
      if (daysUntilExpiry <= 0) {
        result.expired.push(expiringDoc);
      } else {
        result.expiringSoon.push(expiringDoc);
      }
    }

    const supplierMap = new Map<number, ExpiryCheckResult>();
    for (const doc of supplierDocs) {
      const expiryDateTime = fromJSDate(doc.expiryDate!);
      const daysUntilExpiry = Math.ceil(expiryDateTime.diff(now().startOf("day"), "days").days);

      const expiringDoc: ExpiringDocument = {
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        expiryDate: doc.expiryDate!,
        daysUntilExpiry,
        ownerType: "supplier",
        ownerId: doc.supplierId,
      };

      if (!supplierMap.has(doc.supplierId)) {
        supplierMap.set(doc.supplierId, { expiringSoon: [], expired: [] });
      }

      const result = supplierMap.get(doc.supplierId)!;
      if (daysUntilExpiry <= 0) {
        result.expired.push(expiringDoc);
      } else {
        result.expiringSoon.push(expiringDoc);
      }
    }

    return {
      customers: Array.from(customerMap.entries()).map(([customerId, result]) => ({
        customerId,
        result,
      })),
      suppliers: Array.from(supplierMap.entries()).map(([supplierId, result]) => ({
        supplierId,
        result,
      })),
    };
  }
}
