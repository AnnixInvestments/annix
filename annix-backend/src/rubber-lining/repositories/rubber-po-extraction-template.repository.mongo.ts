import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberPoExtractionTemplate } from "../entities/rubber-po-extraction-template.entity";
import { RubberPoExtractionTemplateRepository } from "./rubber-po-extraction-template.repository";

@Injectable()
export class MongoRubberPoExtractionTemplateRepository
  extends MongoCrudRepository<RubberPoExtractionTemplate>
  implements RubberPoExtractionTemplateRepository
{
  constructor(@InjectModel("RubberPoExtractionTemplate") model: Model<RubberPoExtractionTemplate>) {
    super(model);
  }

  build(data: Partial<RubberPoExtractionTemplate>): RubberPoExtractionTemplate {
    return data as RubberPoExtractionTemplate;
  }

  async findActiveByCompanyAndHashWithRegions(
    companyId: number,
    formatHash: string,
  ): Promise<RubberPoExtractionTemplate | null> {
    const doc = await this.documents
      .findOne({ companyId, formatHash, isActive: true })
      .populate("regions")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findActiveByCompanyAndHash(
    companyId: number,
    formatHash: string,
  ): Promise<RubberPoExtractionTemplate | null> {
    const doc = await this.documents
      .findOne({ companyId, formatHash, isActive: true })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findActiveByCompanyWithRegions(companyId: number): Promise<RubberPoExtractionTemplate[]> {
    const docs = await this.documents
      .find({ companyId, isActive: true })
      .populate("regions")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdWithRegions(id: number): Promise<RubberPoExtractionTemplate | null> {
    const doc = await this.documents.findById(id).populate("regions").lean().exec();
    return this.toDomain(doc);
  }

  async deactivateById(id: number): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: { isActive: false } }).exec();
  }

  countActiveByCompany(companyId: number): Promise<number> {
    return this.documents.countDocuments({ companyId, isActive: true }).exec();
  }
}
