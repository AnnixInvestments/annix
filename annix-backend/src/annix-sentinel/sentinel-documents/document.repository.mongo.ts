import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelDocumentRepository } from "./document.repository";
import { AnnixSentinelDocument } from "./entities/document.entity";

@Injectable()
export class MongoAnnixSentinelDocumentRepository
  extends MongoCrudRepository<AnnixSentinelDocument>
  implements AnnixSentinelDocumentRepository
{
  constructor(@InjectModel("AnnixSentinelDocument") model: Model<AnnixSentinelDocument>) {
    super(model);
  }

  async findByCompanyNewestFirst(companyId: number): Promise<AnnixSentinelDocument[]> {
    const documents = await this.documents
      .find({ companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByCompanyAndRequirementNewestFirst(
    companyId: number,
    requirementId: number,
  ): Promise<AnnixSentinelDocument[]> {
    const documents = await this.documents
      .find({ companyId, requirementId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByIdAndCompany(id: number, companyId: number): Promise<AnnixSentinelDocument | null> {
    const document = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(document);
  }

  async findByCompanyAndRequirementIds(
    companyId: number,
    requirementIds: number[],
  ): Promise<AnnixSentinelDocument[]> {
    const documents = await this.documents
      .find({ companyId, requirementId: { $in: requirementIds } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findWithExpiryDate(): Promise<AnnixSentinelDocument[]> {
    const documents = await this.documents
      .find({ expiryDate: { $ne: null } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
