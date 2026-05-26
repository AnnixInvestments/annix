import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ProductCodingType, RubberProductCoding } from "../entities/rubber-product-coding.entity";
import { RubberProductCodingRepository } from "./rubber-product-coding.repository";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@Injectable()
export class MongoRubberProductCodingRepository
  extends MongoCrudRepository<RubberProductCoding>
  implements RubberProductCodingRepository
{
  constructor(@InjectModel("RubberProductCoding") model: Model<RubberProductCoding>) {
    super(model);
  }

  build(data: Partial<RubberProductCoding>): RubberProductCoding {
    return data as RubberProductCoding;
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  countNeedingReview(): Promise<number> {
    return this.documents.countDocuments({ needsReview: true }).exec();
  }

  async findOrderedByType(codingType?: ProductCodingType): Promise<RubberProductCoding[]> {
    const filter: Record<string, unknown> = {};
    if (codingType) {
      filter.codingType = codingType;
    }
    const docs = await this.documents.find(filter).sort({ codingType: 1, code: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByType(codingType: ProductCodingType): Promise<RubberProductCoding[]> {
    const docs = await this.documents.find({ codingType }).lean().exec();
    return this.toDomainList(docs);
  }

  async findManyByCodesAndType(
    codes: string[],
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding[]> {
    const docs = await this.documents
      .find({ code: { $in: codes }, codingType })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findManyByFirebaseUids(firebaseUids: string[]): Promise<RubberProductCoding[]> {
    const docs = await this.documents
      .find({ firebaseUid: { $in: firebaseUids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneById(id: number): Promise<RubberProductCoding | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByIdAndType(
    id: number,
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding | null> {
    const doc = await this.documents.findOne({ _id: id, codingType }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByCodeAndType(
    code: string,
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding | null> {
    const doc = await this.documents.findOne({ code, codingType }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByAliasAndType(
    alias: string,
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding | null> {
    const doc = await this.documents.findOne({ codingType, aliases: alias }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByCodeOrAliasAndType(
    code: string,
    codingType: ProductCodingType,
  ): Promise<RubberProductCoding | null> {
    const doc = await this.documents
      .findOne({ codingType, $or: [{ code }, { aliases: code }] })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByCodeLike(codeFragment: string): Promise<RubberProductCoding | null> {
    const doc = await this.documents
      .findOne({ code: { $regex: escapeRegExp(codeFragment), $options: "i" } })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
