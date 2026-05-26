import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CompanyType, RubberCompany } from "../entities/rubber-company.entity";
import { RubberCompanyRepository } from "./rubber-company.repository";

@Injectable()
export class MongoRubberCompanyRepository
  extends MongoCrudRepository<RubberCompany>
  implements RubberCompanyRepository
{
  constructor(@InjectModel("RubberCompany") model: Model<RubberCompany>) {
    super(model);
  }

  build(data: Partial<RubberCompany>): RubberCompany {
    return data as RubberCompany;
  }

  async findOneByIdOrFail(id: number): Promise<RubberCompany> {
    const found = await this.findById(id);
    if (!found) {
      throw new NotFoundException(`RubberCompany not found: ${id}`);
    }
    return found;
  }

  async findByCompanyType(companyType: CompanyType): Promise<RubberCompany[]> {
    const docs = await this.documents.find({ companyType }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneByNameAndType(
    upperName: string,
    companyType: CompanyType,
  ): Promise<RubberCompany | null> {
    const doc = await this.documents
      .findOne({
        name: { $regex: `^${escapeRegExp(upperName)}$`, $options: "i" },
        companyType,
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByNameLike(namePattern: string): Promise<RubberCompany | null> {
    const trimmed = namePattern.replace(/^%/, "").replace(/%$/, "");
    const doc = await this.documents
      .findOne({ name: { $regex: escapeRegExp(trimmed), $options: "i" } })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByTrimmedNameAndType(
    name: string,
    companyType: string,
  ): Promise<RubberCompany | null> {
    const doc = await this.documents
      .findOne({
        name: { $regex: `^\\s*${escapeRegExp(name.trim())}\\s*$`, $options: "i" },
        companyType,
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByCompoundOwner(isCompoundOwner: boolean): Promise<RubberCompany[]> {
    const docs = await this.documents.find({ isCompoundOwner }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByIds(ids: number[]): Promise<RubberCompany[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findUnmappedToSage(): Promise<RubberCompany[]> {
    const docs = await this.documents.find({ sageContactId: null }).lean().exec();
    return this.toDomainList(docs);
  }

  async findAllOrderedByName(): Promise<RubberCompany[]> {
    const docs = await this.documents.find().sort({ name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findAllWithPricingTierOrderedByName(): Promise<RubberCompany[]> {
    const docs = await this.documents
      .find()
      .populate("pricingTier")
      .sort({ name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countUnmappedToSage(): Promise<number> {
    return this.documents.countDocuments({ sageContactId: null }).exec();
  }

  async updateById(id: number, updates: DeepPartial<RubberCompany>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
