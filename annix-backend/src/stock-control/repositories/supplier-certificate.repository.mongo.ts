import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { nestPopulate } from "../../lib/persistence/nest-populate";
import { SupplierCertificate } from "../entities/supplier-certificate.entity";
import {
  type CertificateFilters,
  SupplierCertificateRepository,
} from "./supplier-certificate.repository";

@Injectable()
export class MongoSupplierCertificateRepository
  extends MongoCrudRepository<SupplierCertificate>
  implements SupplierCertificateRepository
{
  constructor(@InjectModel("SupplierCertificate") model: Model<SupplierCertificate>) {
    super(model);
  }

  build(data: DeepPartial<SupplierCertificate>): SupplierCertificate {
    return data as SupplierCertificate;
  }

  async updateById(id: number, updates: DeepPartial<SupplierCertificate>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }

  async findOneForCompanyByBatchAndType(
    companyId: number,
    supplierId: number,
    batchNumber: string,
    certificateType: string,
  ): Promise<SupplierCertificate | null> {
    const doc = await this.documents
      .findOne({ companyId, supplierId, batchNumber, certificateType })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findAllFilteredForCompany(
    companyId: number,
    filters: CertificateFilters | undefined,
  ): Promise<SupplierCertificate[]> {
    const query: Record<string, unknown> = { companyId };

    if (filters?.supplierId) {
      query.supplierId = filters.supplierId;
    }
    if (filters?.stockItemId) {
      query.stockItemId = filters.stockItemId;
    }
    if (filters?.jobCardId) {
      query.jobCardId = filters.jobCardId;
    }
    if (filters?.batchNumber) {
      query.batchNumber = { $regex: filters.batchNumber, $options: "i" };
    }
    if (filters?.certificateType) {
      query.certificateType = filters.certificateType.toUpperCase();
    }

    const docs = await this.documents
      .find(query)
      .populate(["supplier", "stockItem", "jobCard"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<SupplierCertificate | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(nestPopulate(relations))
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByBatchForCompany(
    companyId: number,
    batchNumber: string,
  ): Promise<SupplierCertificate[]> {
    const docs = await this.documents
      .find({ companyId, batchNumber: batchNumber.trim() })
      .populate(["supplier", "stockItem"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCardForCompany(
    companyId: number,
    jobCardId: number,
  ): Promise<SupplierCertificate[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .populate(["supplier", "stockItem"])
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompanyByBatch(
    companyId: number,
    batchNumber: string,
  ): Promise<SupplierCertificate | null> {
    const doc = await this.documents.findOne({ companyId, batchNumber }).lean().exec();
    return this.toDomain(doc);
  }

  async findBatchSummaryForCompany(companyId: number): Promise<SupplierCertificate[]> {
    const docs = await this.documents.find({ companyId }).select("_id batchNumber").lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<SupplierCertificate | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findNeedingProductExtractionForCompany(companyId: number): Promise<SupplierCertificate[]> {
    const docs = await this.documents
      .find({
        companyId,
        $or: [
          { description: null },
          { $expr: { $gt: [{ $strLenCP: { $ifNull: ["$description", ""] } }, 60] } },
          { uploadedByName: "Email Import" },
        ],
      })
      .select("_id filePath mimeType companyId")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
