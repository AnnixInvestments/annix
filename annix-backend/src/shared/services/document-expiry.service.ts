import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  LessThanOrEqual,
  IsNull,
  MoreThan,
  And,
  Not,
} from 'typeorm';
import { CustomerDocument } from '../../customer/entities/customer-document.entity';
import { SupplierDocument } from '../../supplier/entities/supplier-document.entity';
import { now, fromJSDate } from '../../lib/datetime';

export interface ExpiringDocument {
  id: number;
  documentType: string;
  fileName: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  ownerType: 'customer' | 'supplier';
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
    @InjectRepository(CustomerDocument)
    private readonly customerDocumentRepo: Repository<CustomerDocument>,
    @InjectRepository(SupplierDocument)
    private readonly supplierDocumentRepo: Repository<SupplierDocument>,
  ) {}

  async checkCustomerDocumentExpiry(
    customerId: number,
  ): Promise<ExpiryCheckResult> {
    const today = now().startOf('day');
    const warningDate = today.plus({ days: this.warningDays }).toJSDate();

    const documents = await this.customerDocumentRepo.find({
      where: {
        customerId,
        expiryDate: Not(IsNull()),
      },
      relations: ['customer'],
    });

    const expiringSoon: ExpiringDocument[] = [];
    const expired: ExpiringDocument[] = [];

    for (const doc of documents) {
      if (!doc.expiryDate) continue;

      const expiryDateTime = fromJSDate(doc.expiryDate);
      const daysUntilExpiry = Math.ceil(
        expiryDateTime.diff(today, 'days').days,
      );

      const expiringDoc: ExpiringDocument = {
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        expiryDate: doc.expiryDate,
        daysUntilExpiry,
        ownerType: 'customer',
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

  async checkSupplierDocumentExpiry(
    supplierId: number,
  ): Promise<ExpiryCheckResult> {
    const today = now().startOf('day');

    const documents = await this.supplierDocumentRepo.find({
      where: {
        supplierId,
        expiryDate: Not(IsNull()),
      },
      relations: ['supplier'],
    });

    const expiringSoon: ExpiringDocument[] = [];
    const expired: ExpiringDocument[] = [];

    for (const doc of documents) {
      if (!doc.expiryDate) continue;

      const expiryDateTime = fromJSDate(doc.expiryDate);
      const daysUntilExpiry = Math.ceil(
        expiryDateTime.diff(today, 'days').days,
      );

      const expiringDoc: ExpiringDocument = {
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        expiryDate: doc.expiryDate,
        daysUntilExpiry,
        ownerType: 'supplier',
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

  async markWarningsSent(
    documentIds: number[],
    ownerType: 'customer' | 'supplier',
  ): Promise<void> {
    const repo =
      ownerType === 'customer'
        ? this.customerDocumentRepo
        : this.supplierDocumentRepo;
    await repo.update(documentIds, {
      expiryWarningSentAt: now().toJSDate(),
    });
  }

  async markExpiredNotificationSent(
    documentIds: number[],
    ownerType: 'customer' | 'supplier',
  ): Promise<void> {
    const repo =
      ownerType === 'customer'
        ? this.customerDocumentRepo
        : this.supplierDocumentRepo;
    await repo.update(documentIds, {
      expiryNotificationSentAt: now().toJSDate(),
      isExpired: true,
    });
  }

  async updateDocumentExpiry(
    documentId: number,
    ownerType: 'customer' | 'supplier',
    newExpiryDate: Date,
  ): Promise<void> {
    const repo =
      ownerType === 'customer'
        ? this.customerDocumentRepo
        : this.supplierDocumentRepo;
    await repo.update(documentId, {
      expiryDate: newExpiryDate,
      expiryWarningSentAt: null,
      expiryNotificationSentAt: null,
      isExpired: false,
    });
    this.logger.log(
      `Document ${documentId} expiry updated to ${newExpiryDate.toISOString()}`,
    );
  }

  async getAllExpiringDocuments(): Promise<{
    customers: Array<{ customerId: number; result: ExpiryCheckResult }>;
    suppliers: Array<{ supplierId: number; result: ExpiryCheckResult }>;
  }> {
    const today = now().startOf('day').toJSDate();
    const warningDate = now().plus({ days: this.warningDays }).toJSDate();

    const customerDocs = await this.customerDocumentRepo.find({
      where: {
        expiryDate: LessThanOrEqual(warningDate),
        expiryWarningSentAt: IsNull(),
      },
      relations: ['customer'],
    });

    const supplierDocs = await this.supplierDocumentRepo.find({
      where: {
        expiryDate: LessThanOrEqual(warningDate),
        expiryWarningSentAt: IsNull(),
      },
      relations: ['supplier'],
    });

    const customerMap = new Map<number, ExpiryCheckResult>();
    for (const doc of customerDocs) {
      const expiryDateTime = fromJSDate(doc.expiryDate!);
      const daysUntilExpiry = Math.ceil(
        expiryDateTime.diff(now().startOf('day'), 'days').days,
      );

      const expiringDoc: ExpiringDocument = {
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        expiryDate: doc.expiryDate!,
        daysUntilExpiry,
        ownerType: 'customer',
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
      const daysUntilExpiry = Math.ceil(
        expiryDateTime.diff(now().startOf('day'), 'days').days,
      );

      const expiringDoc: ExpiringDocument = {
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        expiryDate: doc.expiryDate!,
        daysUntilExpiry,
        ownerType: 'supplier',
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
      customers: Array.from(customerMap.entries()).map(
        ([customerId, result]) => ({ customerId, result }),
      ),
      suppliers: Array.from(supplierMap.entries()).map(
        ([supplierId, result]) => ({ supplierId, result }),
      ),
    };
  }
}
