import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CertificateRepository } from "./certificate.repository";
import type { CertificatePage } from "./certificate.service";
import type { CertificateFilterDto } from "./dto/certificate.dto";
import { PlatformCertificate } from "./entities/certificate.entity";

@Injectable()
export class MongoCertificateRepository
  extends MongoCrudRepository<PlatformCertificate>
  implements CertificateRepository
{
  constructor(@InjectModel("PlatformCertificate") model: Model<PlatformCertificate>) {
    super(model);
  }

  async search(companyId: number, filters: CertificateFilterDto): Promise<CertificatePage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { companyId, versionStatus: "ACTIVE" };

    if (filters.sourceModule) {
      query.sourceModule = filters.sourceModule;
    }
    if (filters.certificateCategory) {
      query.certificateCategory = filters.certificateCategory;
    }
    if (filters.processingStatus) {
      query.processingStatus = filters.processingStatus;
    }
    if (filters.supplierContactId) {
      query.supplierContactId = filters.supplierContactId;
    }
    if (filters.compoundCode) {
      query.compoundCode = filters.compoundCode;
    }
    if (filters.jobCardId) {
      query.jobCardId = filters.jobCardId;
    }
    if (filters.search) {
      const re = new RegExp(filters.search, "i");
      query.$or = [
        { certificateNumber: re },
        { batchNumber: re },
        { supplierName: re },
        { compoundCode: re },
      ];
    }

    const [documents, total] = await Promise.all([
      this.documents.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);

    return { data: this.toDomainList(documents), total, page, limit };
  }

  async findByCompanyAndId(
    companyId: number,
    id: number,
    _relations: string[] = [],
  ): Promise<PlatformCertificate | null> {
    const document = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(document);
  }

  async findByBatchNumber(companyId: number, batchNumber: string): Promise<PlatformCertificate[]> {
    const documents = await this.documents
      .find({ companyId, batchNumber })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByCompoundCode(
    companyId: number,
    compoundCode: string,
  ): Promise<PlatformCertificate[]> {
    const documents = await this.documents
      .find({ companyId, compoundCode })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByLegacyScCertificateId(id: number): Promise<PlatformCertificate | null> {
    const document = await this.documents.findOne({ legacyScCertificateId: id }).lean().exec();
    return this.toDomain(document);
  }

  async findByLegacyScCalibrationId(id: number): Promise<PlatformCertificate | null> {
    const document = await this.documents.findOne({ legacyScCalibrationId: id }).lean().exec();
    return this.toDomain(document);
  }

  async findByLegacyRubberCocId(id: number): Promise<PlatformCertificate | null> {
    const document = await this.documents.findOne({ legacyRubberCocId: id }).lean().exec();
    return this.toDomain(document);
  }
}
