import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, LessThanOrEqual, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CustomerDocumentRepository } from "./customer-document.repository";
import {
  CustomerDocument,
  CustomerDocumentValidationStatus,
} from "./entities/customer-document.entity";

@Injectable()
export class PostgresCustomerDocumentRepository
  extends TypeOrmCrudRepository<CustomerDocument>
  implements CustomerDocumentRepository
{
  constructor(@InjectRepository(CustomerDocument) repository: Repository<CustomerDocument>) {
    super(repository);
  }

  findByCustomerIdOrdered(customerId: number): Promise<CustomerDocument[]> {
    return this.repository.find({
      where: { customerId },
      order: { uploadedAt: "DESC" },
    });
  }

  findByCustomerIdWithReviewer(customerId: number): Promise<CustomerDocument[]> {
    return this.repository.find({
      where: { customerId },
      relations: ["reviewedBy"],
      order: { uploadedAt: "DESC" },
    });
  }

  findRequiredByCustomerId(customerId: number): Promise<CustomerDocument[]> {
    return this.repository.find({
      where: { customerId, isRequired: true },
    });
  }

  findByIdWithRelations(id: number, relations: string[]): Promise<CustomerDocument | null> {
    return this.repository.findOne({ where: { id }, relations });
  }

  findOneForCustomerWithRelations(
    id: number,
    customerId: number,
    relations: string[],
  ): Promise<CustomerDocument | null> {
    return this.repository.findOne({ where: { id, customerId }, relations });
  }

  async approvePendingForCustomer(
    customerId: number,
    reviewedById: number,
    reviewedAt: Date,
  ): Promise<void> {
    await this.repository.update(
      {
        customerId,
        validationStatus: CustomerDocumentValidationStatus.PENDING,
      },
      {
        validationStatus: CustomerDocumentValidationStatus.VALID,
        reviewedById,
        reviewedAt,
      },
    );
  }

  async markValidAsReviewed(customerId: number, reviewedAt: Date): Promise<void> {
    await this.repository.update(
      {
        customerId,
        validationStatus: CustomerDocumentValidationStatus.VALID,
      },
      { reviewedAt },
    );
  }

  findWithExpiryByCustomerId(customerId: number): Promise<CustomerDocument[]> {
    return this.repository.find({
      where: { customerId, expiryDate: Not(IsNull()) },
      relations: ["customer"],
    });
  }

  findExpiringWithoutWarning(warningDate: Date): Promise<CustomerDocument[]> {
    return this.repository.find({
      where: {
        expiryDate: LessThanOrEqual(warningDate),
        expiryWarningSentAt: IsNull(),
      },
      relations: ["customer"],
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
