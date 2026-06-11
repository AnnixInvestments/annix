import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { nestPopulate } from "../lib/persistence/nest-populate";
import {
  SupplierDocument,
  SupplierDocumentType,
  SupplierDocumentValidationStatus,
} from "./entities/supplier-document.entity";
import { SupplierDocumentRepository } from "./supplier-document.repository";

@Injectable()
export class MongoSupplierDocumentRepository
  extends MongoCrudRepository<SupplierDocument>
  implements SupplierDocumentRepository
{
  constructor(@InjectModel("SupplierDocument") model: Model<SupplierDocument>) {
    super(model);
  }

  async findBySupplierIdAndType(
    supplierId: number,
    documentType: SupplierDocumentType,
  ): Promise<SupplierDocument | null> {
    const document = await this.documents
      .findOne({ supplierId, documentType })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findByIdAndSupplierId(id: number, supplierId: number): Promise<SupplierDocument | null> {
    const document = await this.documents
      .findOne({ _id: id, supplierId })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findByIdAndSupplierIdWithRelations(
    id: number,
    supplierId: number,
    relations: string[],
  ): Promise<SupplierDocument | null> {
    const document = await this.documents
      .findOne({ _id: id, supplierId })
      .populate(nestPopulate(relations))
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findBySupplierIdOrdered(supplierId: number): Promise<SupplierDocument[]> {
    const docs = await this.documents
      .find({ supplierId })
      .sort({ uploadedAt: -1 })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findBySupplierId(supplierId: number): Promise<SupplierDocument[]> {
    const docs = await this.documents.find({ supplierId }).session(this.session).lean().exec();
    return this.toDomainList(docs);
  }

  async markValidAsReviewed(supplierId: number, reviewedAt: Date): Promise<void> {
    await this.documents
      .updateMany(
        {
          supplierId,
          validationStatus: SupplierDocumentValidationStatus.VALID,
        },
        { $set: { reviewedAt } },
      )
      .session(this.session)
      .exec();
  }

  async findWithExpiryBySupplierId(supplierId: number): Promise<SupplierDocument[]> {
    const documents = await this.documents
      .find({ supplierId, expiryDate: { $ne: null } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findExpiringWithoutWarning(warningDate: Date): Promise<SupplierDocument[]> {
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
