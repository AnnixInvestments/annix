import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CustomerDocumentRepository } from "./customer-document.repository";
import {
  CustomerDocument,
  CustomerDocumentValidationStatus,
} from "./entities/customer-document.entity";

@Injectable()
export class MongoCustomerDocumentRepository
  extends MongoCrudRepository<CustomerDocument>
  implements CustomerDocumentRepository
{
  constructor(@InjectModel("CustomerDocument") model: Model<CustomerDocument>) {
    super(model);
  }

  async findByCustomerIdOrdered(customerId: number): Promise<CustomerDocument[]> {
    const docs = await this.documents.find({ customerId }).sort({ uploadedAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByCustomerIdWithReviewer(customerId: number): Promise<CustomerDocument[]> {
    const docs = await this.documents
      .find({ customerId })
      .populate(["reviewedBy"])
      .sort({ uploadedAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRequiredByCustomerId(customerId: number): Promise<CustomerDocument[]> {
    const docs = await this.documents.find({ customerId, isRequired: true }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIdWithRelations(id: number, relations: string[]): Promise<CustomerDocument | null> {
    const document = await this.documents.findById(id).populate(relations).lean().exec();
    return this.toDomain(document);
  }

  async findOneForCustomerWithRelations(
    id: number,
    customerId: number,
    relations: string[],
  ): Promise<CustomerDocument | null> {
    const document = await this.documents
      .findOne({ _id: id, customerId })
      .populate(relations)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async approvePendingForCustomer(
    customerId: number,
    reviewedById: number,
    reviewedAt: Date,
  ): Promise<void> {
    await this.documents
      .updateMany(
        {
          customerId,
          validationStatus: CustomerDocumentValidationStatus.PENDING,
        },
        {
          $set: {
            validationStatus: CustomerDocumentValidationStatus.VALID,
            reviewedById,
            reviewedAt,
          },
        },
      )
      .exec();
  }

  async markValidAsReviewed(customerId: number, reviewedAt: Date): Promise<void> {
    await this.documents
      .updateMany(
        {
          customerId,
          validationStatus: CustomerDocumentValidationStatus.VALID,
        },
        { $set: { reviewedAt } },
      )
      .exec();
  }

  async findWithExpiryByCustomerId(customerId: number): Promise<CustomerDocument[]> {
    const documents = await this.documents
      .find({ customerId, expiryDate: { $ne: null } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findExpiringWithoutWarning(warningDate: Date): Promise<CustomerDocument[]> {
    const documents = await this.documents
      .find({ expiryDate: { $lte: warningDate }, expiryWarningSentAt: null })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async markWarningSent(documentIds: number[], sentAt: Date): Promise<void> {
    if (documentIds.length === 0) return;
    await this.documents
      .updateMany({ _id: { $in: documentIds } }, { $set: { expiryWarningSentAt: sentAt } })
      .exec();
  }

  async markExpiredNotificationSent(documentIds: number[], sentAt: Date): Promise<void> {
    if (documentIds.length === 0) return;
    await this.documents
      .updateMany(
        { _id: { $in: documentIds } },
        { $set: { expiryNotificationSentAt: sentAt, isExpired: true } },
      )
      .exec();
  }

  async updateExpiryAndResetFlags(documentId: number, newExpiryDate: Date): Promise<void> {
    await this.documents
      .updateOne(
        { _id: documentId },
        {
          $set: {
            expiryDate: newExpiryDate,
            expiryWarningSentAt: null,
            expiryNotificationSentAt: null,
            isExpired: false,
          },
        },
      )
      .exec();
  }
}
