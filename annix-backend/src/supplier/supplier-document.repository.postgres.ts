import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, LessThanOrEqual, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import {
  SupplierDocument,
  SupplierDocumentType,
  SupplierDocumentValidationStatus,
} from "./entities/supplier-document.entity";
import { SupplierDocumentRepository } from "./supplier-document.repository";

@Injectable()
export class PostgresSupplierDocumentRepository
  extends TypeOrmCrudRepository<SupplierDocument>
  implements SupplierDocumentRepository
{
  constructor(@InjectRepository(SupplierDocument) repository: Repository<SupplierDocument>) {
    super(repository);
  }

  findBySupplierIdAndType(
    supplierId: number,
    documentType: SupplierDocumentType,
  ): Promise<SupplierDocument | null> {
    return this.repository.findOne({ where: { supplierId, documentType } });
  }

  findByIdAndSupplierId(id: number, supplierId: number): Promise<SupplierDocument | null> {
    return this.repository.findOne({ where: { id, supplierId } });
  }

  findByIdAndSupplierIdWithRelations(
    id: number,
    supplierId: number,
    relations: string[],
  ): Promise<SupplierDocument | null> {
    return this.repository.findOne({ where: { id, supplierId }, relations });
  }

  findBySupplierIdOrdered(supplierId: number): Promise<SupplierDocument[]> {
    return this.repository.find({
      where: { supplierId },
      order: { uploadedAt: "DESC" },
    });
  }

  findBySupplierId(supplierId: number): Promise<SupplierDocument[]> {
    return this.repository.find({ where: { supplierId } });
  }

  async markValidAsReviewed(supplierId: number, reviewedAt: Date): Promise<void> {
    await this.repository.update(
      {
        supplierId,
        validationStatus: SupplierDocumentValidationStatus.VALID,
      },
      { reviewedAt },
    );
  }

  findWithExpiryBySupplierId(supplierId: number): Promise<SupplierDocument[]> {
    return this.repository.find({
      where: { supplierId, expiryDate: Not(IsNull()) },
      relations: ["supplier"],
    });
  }

  findExpiringWithoutWarning(warningDate: Date): Promise<SupplierDocument[]> {
    return this.repository.find({
      where: {
        expiryDate: LessThanOrEqual(warningDate),
        expiryWarningSentAt: IsNull(),
      },
      relations: ["supplier"],
    });
  }

  async markWarningSent(documentIds: number[], sentAt: Date): Promise<void> {
    if (documentIds.length === 0) return;
    await this.repository.update({ id: In(documentIds) }, { expiryWarningSentAt: sentAt });
  }

  async markExpiredNotificationSent(documentIds: number[], sentAt: Date): Promise<void> {
    if (documentIds.length === 0) return;
    await this.repository.update(
      { id: In(documentIds) },
      { expiryNotificationSentAt: sentAt, isExpired: true },
    );
  }

  async updateExpiryAndResetFlags(documentId: number, newExpiryDate: Date): Promise<void> {
    await this.repository.update(documentId, {
      expiryDate: newExpiryDate,
      expiryWarningSentAt: null,
      expiryNotificationSentAt: null,
      isExpired: false,
    });
  }
}
